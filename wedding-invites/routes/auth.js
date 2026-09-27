/**
 * INVITARTE — RUTAS DE AUTENTICACIÓN
 *
 * POST /api/auth/registro          — Crear cuenta
 * POST /api/auth/login             — Iniciar sesión
 * POST /api/auth/logout            — Cerrar sesión
 * POST /api/auth/refresh           — Renovar access token
 * GET  /api/auth/me                — Datos del usuario autenticado
 * POST /api/auth/verificar-email   — Verificar email con token
 * POST /api/auth/solicitar-reset   — Solicitar reset de contraseña
 * POST /api/auth/reset-password    — Aplicar nueva contraseña
 *
 * SEGURIDAD IMPLEMENTADA:
 * - bcrypt con cost factor 12 para hashing de contraseñas
 * - SHA-256 para almacenar tokens de verificación/reset (nunca el token en claro)
 * - Rate limiting: 5 intentos de login por IP cada 15 minutos
 * - Bloqueo de cuenta: 5 intentos fallidos → bloqueo 15 minutos
 * - Refresh tokens rotativos (un uso, luego se invalidan)
 * - httpOnly cookies para el refresh token (no accesible desde JS)
 * - Respuesta genérica en login para evitar user enumeration
 * - Validación y sanitización de todos los inputs
 */

const express    = require('express');
const bcrypt     = require('bcryptjs');
const crypto     = require('crypto');
const rateLimit  = require('express-rate-limit');

const { getDB }               = require('../database/init');
const { generateAccessToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

/* ── CONFIGURACIÓN ──────────────────────── */
const BCRYPT_ROUNDS      = 12;
const REFRESH_TOKEN_DAYS = 30;
const RESET_TOKEN_HOURS  = 2;
const VERIFY_TOKEN_HOURS = 48;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES    = 15;

/* ── RATE LIMITERS ──────────────────────── */
// Registro: 5 cuentas por IP cada hora
const registroLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { ok: false, code: 'RATE_LIMIT', message: 'Demasiados intentos. Espera un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login: 10 intentos por IP cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { ok: false, code: 'RATE_LIMIT', message: 'Demasiados intentos de login. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Reset password: 3 por IP cada hora
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { ok: false, code: 'RATE_LIMIT', message: 'Demasiadas solicitudes de recuperación. Espera una hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ── HELPERS ────────────────────────────── */

function hashToken(token) {
  // Almacenar SHA-256 del token, no el token en claro
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateOpaqueToken(bytes = 32) {
  // Token criptográficamente seguro
  return crypto.randomBytes(bytes).toString('hex');
}

function sanitizeEmail(email) {
  return email.trim().toLowerCase();
}

function sanitizeText(text) {
  return text ? text.trim().replace(/[<>"']/g, '') : '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  // Mínimo 8 chars, al menos 1 mayúscula, 1 minúscula, 1 número
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

function setRefreshCookie(res, token) {
  res.cookie('ia_refresh', token, {
    httpOnly: true,              // No accesible desde JavaScript
    secure:   process.env.NODE_ENV === 'production', // Solo HTTPS en producción
    sameSite: 'Strict',         // Protección CSRF
    maxAge:   REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    path:     '/api/auth',      // Solo disponible en rutas de auth
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('ia_refresh', { path: '/api/auth' });
}

function safeUserData(user) {
  // Nunca exponer password_hash, intentos_fallidos ni bloqueado_hasta
  const { password_hash, intentos_fallidos, bloqueado_hasta, ...safe } = user;
  return safe;
}

/* ════════════════════════════════════════
   POST /api/auth/registro
════════════════════════════════════════ */
router.post('/registro', registroLimiter, async (req, res) => {
  try {
    const { nombre, apellido, email, telefono, password } = req.body;

    // ── Validaciones ──
    const nombreCompleto = sanitizeText(`${nombre || ''} ${apellido || ''}`).trim();
    const emailLimpio    = sanitizeEmail(email || '');
    const telefonoLimpio = sanitizeText(telefono || '');

    const errors = [];
    if (!nombreCompleto || nombreCompleto.length < 2)
      errors.push({ field: 'nombre', message: 'Nombre inválido' });
    if (!isValidEmail(emailLimpio))
      errors.push({ field: 'email', message: 'Correo electrónico inválido' });
    if (!password || !isStrongPassword(password))
      errors.push({ field: 'password', message: 'La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas y números' });

    if (errors.length > 0) {
      return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', errors });
    }

    const db = getDB();

    // ── Verificar email duplicado ──
    const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailLimpio);
    if (existente) {
      return res.status(409).json({
        ok: false,
        code: 'EMAIL_EXISTS',
        errors: [{ field: 'email', message: 'Este correo ya está registrado' }],
      });
    }

    // ── Hash de contraseña con bcrypt ──
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // ── Token de verificación de email ──
    const verifyToken     = generateOpaqueToken();
    const verifyTokenHash = hashToken(verifyToken);
    const verifyExpiry    = new Date(Date.now() + VERIFY_TOKEN_HOURS * 3600000).toISOString();

    // ── Insertar usuario ──
    const insertUser = db.prepare(`
      INSERT INTO usuarios (nombre, email, telefono, password_hash)
      VALUES (@nombre, @email, @telefono, @password_hash)
    `);

    const insertToken = db.prepare(`
      INSERT INTO tokens_temporales (usuario_id, token_hash, tipo, expires_at)
      VALUES (@usuario_id, @token_hash, 'verificacion_email', @expires_at)
    `);

    // Transacción atómica: insertar usuario + token en una sola operación
    const transaction = db.transaction(() => {
      insertUser.run({
        nombre:        nombreCompleto,
        email:         emailLimpio,
        telefono:      telefonoLimpio,
        password_hash: passwordHash,
      });

      const newUser = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailLimpio);

      insertToken.run({
        usuario_id: newUser.id,
        token_hash: verifyTokenHash,
        expires_at: verifyExpiry,
      });

      return newUser;
    });

    const newUser = transaction();
    const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(newUser.id);

    // ── Crear sesión inicial ──
    const accessToken  = generateAccessToken(usuario);
    const refreshToken = generateOpaqueToken();
    const refreshHash  = hashToken(refreshToken);
    const refreshExpiry = new Date(Date.now() + REFRESH_TOKEN_DAYS * 86400000).toISOString();

    db.prepare(`
      INSERT INTO sesiones (usuario_id, refresh_token, user_agent, ip, expires_at)
      VALUES (@usuario_id, @refresh_token, @user_agent, @ip, @expires_at)
    `).run({
      usuario_id:    usuario.id,
      refresh_token: refreshHash,
      user_agent:    req.headers['user-agent'] || '',
      ip:            req.ip || '',
      expires_at:    refreshExpiry,
    });

    setRefreshCookie(res, refreshToken);

    // TODO en producción: enviar email de verificación con verifyToken
    // EmailService.sendVerification(emailLimpio, verifyToken);

    return res.status(201).json({
      ok:          true,
      accessToken,
      user:        safeUserData(usuario),
      // Solo en desarrollo/demo — remover en producción:
      _verifyToken: process.env.NODE_ENV !== 'production' ? verifyToken : undefined,
    });

  } catch (err) {
    console.error('Error en registro:', err);
    return res.status(500).json({ ok: false, code: 'SERVER_ERROR', message: 'Error interno del servidor' });
  }
});

/* ════════════════════════════════════════
   POST /api/auth/login
════════════════════════════════════════ */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailLimpio = sanitizeEmail(email || '');

    // Validación básica (respuesta genérica para evitar user enumeration)
    if (!emailLimpio || !password) {
      return res.status(400).json({ ok: false, code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos' });
    }

    const db = getDB();
    const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(emailLimpio);

    // ── Verificar bloqueo de cuenta ──
    if (usuario?.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
      const minutosRestantes = Math.ceil((new Date(usuario.bloqueado_hasta) - Date.now()) / 60000);
      return res.status(429).json({
        ok: false,
        code: 'ACCOUNT_LOCKED',
        message: `Cuenta bloqueada temporalmente. Intenta en ${minutosRestantes} minutos.`,
      });
    }

    // ── Verificar credenciales ──
    // Siempre ejecutar bcrypt.compare para evitar timing attacks
    // (aunque el usuario no exista, comparamos con un hash ficticio)
    const hashFicticio = '$2a$12$GzHi5V4.y3qBJNGGAkV7MOXXn9g0YrBG0XN4PtTfwfMUZoTfZ0zYO';
    const hashReal     = usuario?.password_hash || hashFicticio;
    const passwordValido = await bcrypt.compare(password, hashReal);

    if (!usuario || !passwordValido || !usuario.activo) {
      // Registrar intento fallido si el usuario existe
      if (usuario) {
        const nuevosIntentos = (usuario.intentos_fallidos || 0) + 1;
        const bloqueo = nuevosIntentos >= MAX_LOGIN_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString()
          : null;

        db.prepare(`
          UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?
        `).run(nuevosIntentos, bloqueo, usuario.id);
      }

      // Respuesta genérica — no revelar si el email existe
      return res.status(401).json({ ok: false, code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos' });
    }

    // ── Login exitoso: resetear intentos fallidos ──
    db.prepare(`
      UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?
    `).run(usuario.id);

    // ── Crear sesión ──
    const accessToken  = generateAccessToken(usuario);
    const refreshToken = generateOpaqueToken();
    const refreshHash  = hashToken(refreshToken);
    const refreshExpiry = new Date(Date.now() + REFRESH_TOKEN_DAYS * 86400000).toISOString();

    db.prepare(`
      INSERT INTO sesiones (usuario_id, refresh_token, user_agent, ip, expires_at)
      VALUES (@usuario_id, @refresh_token, @user_agent, @ip, @expires_at)
    `).run({
      usuario_id:    usuario.id,
      refresh_token: refreshHash,
      user_agent:    req.headers['user-agent'] || '',
      ip:            req.ip || '',
      expires_at:    refreshExpiry,
    });

    setRefreshCookie(res, refreshToken);

    return res.json({
      ok:         true,
      accessToken,
      user:       safeUserData(usuario),
    });

  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ ok: false, code: 'SERVER_ERROR', message: 'Error interno del servidor' });
  }
});

/* ════════════════════════════════════════
   POST /api/auth/logout
════════════════════════════════════════ */
router.post('/logout', (req, res) => {
  try {
    const refreshToken = req.cookies?.ia_refresh;
    if (refreshToken) {
      const db = getDB();
      const refreshHash = hashToken(refreshToken);
      // Revocar el refresh token en la BD
      db.prepare('UPDATE sesiones SET revocado = 1 WHERE refresh_token = ?').run(refreshHash);
    }
    clearRefreshCookie(res);
    return res.json({ ok: true, message: 'Sesión cerrada' });
  } catch (err) {
    console.error('Error en logout:', err);
    clearRefreshCookie(res);
    return res.json({ ok: true, message: 'Sesión cerrada' });
  }
});

/* ════════════════════════════════════════
   POST /api/auth/refresh
   Renueva el access token usando el refresh token (httpOnly cookie)
════════════════════════════════════════ */
router.post('/refresh', (req, res) => {
  try {
    const refreshToken = req.cookies?.ia_refresh;
    if (!refreshToken) {
      return res.status(401).json({ ok: false, code: 'NO_REFRESH_TOKEN', message: 'No hay sesión activa' });
    }

    const db = getDB();
    const refreshHash = hashToken(refreshToken);

    const sesion = db.prepare(`
      SELECT s.*, u.id as uid, u.email, u.rol, u.plan, u.nombre, u.activo
      FROM sesiones s
      JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.refresh_token = ? AND s.revocado = 0
    `).get(refreshHash);

    if (!sesion) {
      clearRefreshCookie(res);
      return res.status(401).json({ ok: false, code: 'INVALID_REFRESH', message: 'Sesión inválida' });
    }

    if (new Date(sesion.expires_at) < new Date()) {
      db.prepare('UPDATE sesiones SET revocado = 1 WHERE id = ?').run(sesion.id);
      clearRefreshCookie(res);
      return res.status(401).json({ ok: false, code: 'REFRESH_EXPIRED', message: 'Sesión expirada' });
    }

    if (!sesion.activo) {
      db.prepare('UPDATE sesiones SET revocado = 1 WHERE usuario_id = ?').run(sesion.usuario_id);
      clearRefreshCookie(res);
      return res.status(401).json({ ok: false, code: 'ACCOUNT_DISABLED', message: 'Cuenta desactivada' });
    }

    // ── Rotación de refresh token (invalidar el anterior, emitir uno nuevo) ──
    const newRefreshToken = generateOpaqueToken();
    const newRefreshHash  = hashToken(newRefreshToken);
    const newExpiry = new Date(Date.now() + REFRESH_TOKEN_DAYS * 86400000).toISOString();

    db.transaction(() => {
      db.prepare('UPDATE sesiones SET revocado = 1 WHERE id = ?').run(sesion.id);
      db.prepare(`
        INSERT INTO sesiones (usuario_id, refresh_token, user_agent, ip, expires_at)
        VALUES (@usuario_id, @refresh_token, @user_agent, @ip, @expires_at)
      `).run({
        usuario_id:    sesion.usuario_id,
        refresh_token: newRefreshHash,
        user_agent:    req.headers['user-agent'] || '',
        ip:            req.ip || '',
        expires_at:    newExpiry,
      });
    })();

    setRefreshCookie(res, newRefreshToken);

    const accessToken = generateAccessToken({
      id:    sesion.uid,
      email: sesion.email,
      rol:   sesion.rol,
      plan:  sesion.plan,
    });

    return res.json({ ok: true, accessToken });

  } catch (err) {
    console.error('Error en refresh:', err);
    return res.status(500).json({ ok: false, code: 'SERVER_ERROR', message: 'Error interno del servidor' });
  }
});

/* ════════════════════════════════════════
   GET /api/auth/me
════════════════════════════════════════ */
router.get('/me', requireAuth, (req, res) => {
  try {
    const db = getDB();
    const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.user.id);
    if (!usuario) {
      return res.status(404).json({ ok: false, code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' });
    }
    return res.json({ ok: true, user: safeUserData(usuario) });
  } catch (err) {
    console.error('Error en /me:', err);
    return res.status(500).json({ ok: false, code: 'SERVER_ERROR', message: 'Error interno del servidor' });
  }
});

/* ════════════════════════════════════════
   POST /api/auth/verificar-email
════════════════════════════════════════ */
router.post('/verificar-email', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ ok: false, code: 'INVALID_TOKEN', message: 'Token inválido' });

    const db = getDB();
    const tokenHash = hashToken(token);
    const registro = db.prepare(`
      SELECT * FROM tokens_temporales
      WHERE token_hash = ? AND tipo = 'verificacion_email' AND usado = 0
    `).get(tokenHash);

    if (!registro) {
      return res.status(400).json({ ok: false, code: 'INVALID_TOKEN', message: 'Token inválido o ya utilizado' });
    }
    if (new Date(registro.expires_at) < new Date()) {
      return res.status(400).json({ ok: false, code: 'TOKEN_EXPIRED', message: 'El enlace de verificación expiró' });
    }

    db.transaction(() => {
      db.prepare('UPDATE usuarios SET email_verificado = 1 WHERE id = ?').run(registro.usuario_id);
      db.prepare('UPDATE tokens_temporales SET usado = 1 WHERE id = ?').run(registro.id);
    })();

    return res.json({ ok: true, message: 'Email verificado correctamente' });
  } catch (err) {
    console.error('Error en verificar-email:', err);
    return res.status(500).json({ ok: false, code: 'SERVER_ERROR', message: 'Error interno del servidor' });
  }
});

/* ════════════════════════════════════════
   POST /api/auth/solicitar-reset
════════════════════════════════════════ */
router.post('/solicitar-reset', resetLimiter, (req, res) => {
  try {
    const email = sanitizeEmail(req.body?.email || '');
    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, code: 'INVALID_EMAIL', message: 'Correo inválido' });
    }

    const db = getDB();
    const usuario = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);

    // SIEMPRE responder igual, exista o no el usuario (anti user-enumeration)
    if (usuario) {
      const resetToken     = generateOpaqueToken();
      const resetTokenHash = hashToken(resetToken);
      const resetExpiry    = new Date(Date.now() + RESET_TOKEN_HOURS * 3600000).toISOString();

      // Invalidar tokens de reset previos del mismo usuario
      db.prepare(`
        UPDATE tokens_temporales SET usado = 1
        WHERE usuario_id = ? AND tipo = 'reset_password' AND usado = 0
      `).run(usuario.id);

      db.prepare(`
        INSERT INTO tokens_temporales (usuario_id, token_hash, tipo, expires_at)
        VALUES (@usuario_id, @token_hash, 'reset_password', @expires_at)
      `).run({
        usuario_id: usuario.id,
        token_hash: resetTokenHash,
        expires_at: resetExpiry,
      });

      // TODO en producción: EmailService.sendPasswordReset(email, resetToken);
      console.log(`[DEV] Reset token para ${email}: ${resetToken}`);
    }

    return res.json({
      ok: true,
      message: 'Si ese correo está registrado, recibirás las instrucciones en breve.',
      // Solo en desarrollo:
      _resetToken: process.env.NODE_ENV !== 'production' && usuario ? undefined : undefined,
    });
  } catch (err) {
    console.error('Error en solicitar-reset:', err);
    return res.status(500).json({ ok: false, code: 'SERVER_ERROR', message: 'Error interno del servidor' });
  }
});

/* ════════════════════════════════════════
   POST /api/auth/reset-password
════════════════════════════════════════ */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ ok: false, code: 'INVALID_INPUT', message: 'Datos incompletos' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        ok: false, code: 'WEAK_PASSWORD',
        message: 'La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas y números',
      });
    }

    const db = getDB();
    const tokenHash = hashToken(token);
    const registro = db.prepare(`
      SELECT * FROM tokens_temporales
      WHERE token_hash = ? AND tipo = 'reset_password' AND usado = 0
    `).get(tokenHash);

    if (!registro || new Date(registro.expires_at) < new Date()) {
      return res.status(400).json({ ok: false, code: 'INVALID_TOKEN', message: 'El enlace expiró o ya fue utilizado' });
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    db.transaction(() => {
      // Actualizar contraseña
      db.prepare('UPDATE usuarios SET password_hash = ?, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?')
        .run(newHash, registro.usuario_id);
      // Invalidar token
      db.prepare('UPDATE tokens_temporales SET usado = 1 WHERE id = ?').run(registro.id);
      // Revocar TODAS las sesiones activas (seguridad: forzar re-login)
      db.prepare('UPDATE sesiones SET revocado = 1 WHERE usuario_id = ?').run(registro.usuario_id);
    })();

    clearRefreshCookie(res);
    return res.json({ ok: true, message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' });

  } catch (err) {
    console.error('Error en reset-password:', err);
    return res.status(500).json({ ok: false, code: 'SERVER_ERROR', message: 'Error interno del servidor' });
  }
});

module.exports = router;
