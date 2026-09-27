/**
 * INVITARTE — MIDDLEWARE DE AUTENTICACIÓN JWT
 * Verifica el access token en cada request protegido.
 *
 * SEGURIDAD:
 * - Access token: JWT firmado, vida corta (15 min)
 * - Refresh token: opaco, almacenado en DB, httpOnly cookie
 * - No se acepta token expirado aunque la firma sea válida
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRY     = process.env.JWT_EXPIRY || '15m';

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET no definido en .env');
  process.exit(1);
}

/**
 * requireAuth — middleware para rutas privadas.
 * Busca el token en:
 *   1. Header Authorization: Bearer <token>
 *   2. Cookie ia_access (httpOnly)
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  const tokenFromCookie = req.cookies?.ia_access || null;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    return res.status(401).json({
      ok: false,
      code: 'NO_TOKEN',
      message: 'Sesión requerida',
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      clockTolerance: 30, // 30 segundos de tolerancia de reloj
    });

    // Adjuntar datos del usuario al request
    req.user = {
      id:    payload.sub,
      email: payload.email,
      rol:   payload.rol,
      plan:  payload.plan,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        code: 'TOKEN_EXPIRED',
        message: 'Sesión expirada. Inicia sesión nuevamente.',
      });
    }
    return res.status(401).json({
      ok: false,
      code: 'INVALID_TOKEN',
      message: 'Token inválido',
    });
  }
}

/**
 * requireAdmin — solo para rutas de administración.
 * Debe usarse después de requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({
      ok: false,
      code: 'FORBIDDEN',
      message: 'Acceso no autorizado',
    });
  }
  next();
}

/**
 * generateTokens — genera par de tokens para una sesión nueva.
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      sub:   user.id,
      email: user.email,
      rol:   user.rol,
      plan:  user.plan,
    },
    JWT_SECRET,
    {
      algorithm:  'HS256',
      expiresIn:  JWT_EXPIRY,
      issuer:     'invitarte.mx',
      audience:   'invitarte-app',
    }
  );
}

module.exports = { requireAuth, requireAdmin, generateAccessToken };
