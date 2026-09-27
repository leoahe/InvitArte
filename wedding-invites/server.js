require('dotenv').config();

const express      = require('express');
const path         = require('path');
const cors         = require('cors');
const sqlite3      = require('sqlite3').verbose();
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const crypto       = require('crypto');
const nodemailer   = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET  = process.env.JWT_SECRET  || 'invitarte_dev_secret_cambiar_en_produccion';
const BASE_URL    = process.env.BASE_URL    || `http://localhost:${PORT}`;
const GMAIL_USER  = process.env.GMAIL_USER;
const GMAIL_PASS  = process.env.GMAIL_PASS;

/* ══════════════════════════════════════════
   NODEMAILER — Transporter
══════════════════════════════════════════ */
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!GMAIL_USER || !GMAIL_PASS || GMAIL_USER.includes('tu.email')) {
    console.warn('⚠  Email no configurado — los correos se mostrarán en consola (modo dev)');
    return null;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });
  return transporter;
}

async function sendMail(to, subject, html) {
  const t = getTransporter();
  if (!t) {
    // Modo desarrollo: imprimir en consola
    console.log('\n📧 [DEV] Email que se enviaría:');
    console.log('  Para:', to);
    console.log('  Asunto:', subject);
    console.log('  HTML (primeros 300 chars):', html.slice(0, 300));
    console.log('');
    return { dev: true };
  }
  return t.sendMail({
    from: `"InvitArte" <${GMAIL_USER}>`,
    to, subject, html,
  });
}

/* ══════════════════════════════════════════
   PLANTILLAS DE EMAIL
══════════════════════════════════════════ */
function emailBase(content) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#FAF8F4;font-family:'Georgia',serif}
  .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;
    overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#2C2C2C,#3a3025);padding:36px 40px;text-align:center}
  .logo{font-family:'Georgia',serif;font-size:2rem;color:#C9A876;font-style:italic;
    letter-spacing:-.02em}
  .body{padding:36px 40px}
  .title{font-size:1.5rem;color:#2C2C2C;margin:0 0 12px;font-weight:400}
  .text{font-size:.95rem;color:#6B6560;line-height:1.7;margin:0 0 20px}
  .btn{display:inline-block;background:linear-gradient(135deg,#C9A876,#dfc085);
    color:#fff;text-decoration:none;padding:14px 36px;border-radius:999px;
    font-size:.88rem;font-weight:600;letter-spacing:.06em;margin:8px 0 24px}
  .divider{height:1px;background:linear-gradient(90deg,transparent,#EADFCF,transparent);
    margin:24px 0}
  .footer{background:#FAF8F4;padding:20px 40px;text-align:center;
    font-size:.72rem;color:#A09890;border-top:1px solid #EADFCF}
  .note{font-size:.78rem;color:#A09890;word-break:break-all}
</style></head>
<body>
<div class="wrap">
  <div class="header"><div class="logo">InvitArte</div></div>
  <div class="body">${content}</div>
  <div class="footer">
    Invitaciones Digitales Premium · México<br>
    Si no solicitaste esto, ignora este correo.
  </div>
</div>
</body></html>`;
}

function emailBienvenida(nombre) {
  return emailBase(`
    <p class="title">¡Bienvenido, ${nombre}! 🎉</p>
    <p class="text">Tu cuenta en <strong>InvitArte</strong> ha sido creada exitosamente.
    Ya puedes comenzar a crear invitaciones digitales elegantes para tus eventos especiales.</p>
    <p class="text">Accede a tu panel para explorar nuestros diseños:</p>
    <a href="${BASE_URL}/dashboard.html" class="btn">Ir a mi panel</a>
    <div class="divider"></div>
    <p class="text" style="font-size:.82rem;color:#A09890">
    Si tienes alguna duda, responde a este correo y con gusto te ayudamos.</p>
  `);
}

function emailReset(nombre, token) {
  const link = `${BASE_URL}/recuperar.html?token=${token}`;
  return emailBase(`
    <p class="title">Recuperar contraseña</p>
    <p class="text">Hola <strong>${nombre}</strong>, recibimos una solicitud para restablecer
    la contraseña de tu cuenta InvitArte.</p>
    <p class="text">Haz clic en el botón para crear una nueva contraseña:
    Este enlace es válido por <strong>2 horas</strong>.</p>
    <a href="${link}" class="btn">Restablecer mi contraseña</a>
    <div class="divider"></div>
    <p class="text">O copia y pega este enlace en tu navegador:</p>
    <p class="note">${link}</p>
    <div class="divider"></div>
    <p class="text" style="font-size:.82rem;color:#A09890">
    Si no solicitaste este cambio, puedes ignorar este correo.
    Tu contraseña actual sigue siendo la misma.</p>
  `);
}

/* ══════════════════════════════════════════
   MIDDLEWARES
══════════════════════════════════════════ */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

/* ══════════════════════════════════════════
   SQLITE
══════════════════════════════════════════ */
const dbPath = path.join(__dirname, '..', 'database', 'database.sqlite');
console.log('📂 Ruta SQLite:', dbPath);

const db = new sqlite3.Database(dbPath, err => {
  if (err) { console.error('❌ Error SQLite:', err); return; }
  console.log('✅ Conectado a SQLite');
  initDB();
});

function initDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombres TEXT, fecha TEXT, mensaje TEXT,
      plan TEXT, diseno TEXT, email TEXT, telefono TEXT,
      estado TEXT DEFAULT 'pendiente',
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      telefono TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      plan TEXT DEFAULT 'free',
      rol TEXT DEFAULT 'usuario',
      activo INTEGER DEFAULT 1,
      intentos INTEGER DEFAULT 0,
      bloqueado_hasta TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS tokens_reset (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      usado INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    console.log('✅ Tablas de autenticación listas');
  });
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const uid     = () => crypto.randomBytes(16).toString('hex');
const hTok    = t  => crypto.createHash('sha256').update(t).digest('hex');
const randTok = () => crypto.randomBytes(32).toString('hex');

const dbGet = (sql, p=[]) =>
  new Promise((res,rej) => db.get(sql, p, (e,r) => e ? rej(e) : res(r)));
const dbRun = (sql, p=[]) =>
  new Promise((res,rej) => db.run(sql, p, function(e){ e ? rej(e) : res(this); }));

function makeJWT(user) {
  return jwt.sign(
    { sub:user.id, email:user.email, rol:user.rol, plan:user.plan },
    JWT_SECRET,
    { expiresIn:'7d', algorithm:'HS256' }
  );
}

function safeUser(u) {
  if (!u) return null;
  const { password_hash, intentos, bloqueado_hasta, ...safe } = u;
  return safe;
}

// Rate limiting simple en memoria
const rl = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const e   = rl.get(key) || { n:0, reset: now+windowMs };
  if (now > e.reset) { e.n=0; e.reset=now+windowMs; }
  e.n++; rl.set(key, e);
  return e.n > max;
}

/* ══════════════════════════════════════════
   API — PEDIDOS (original)
══════════════════════════════════════════ */
app.post('/api/pedidos', (req, res) => {
  const { nombres, fecha, mensaje, plan, diseno, email, telefono } = req.body;
  if (!nombres || !fecha || !plan || !diseno)
    return res.status(400).json({ error:'Faltan datos obligatorios' });
  db.run(
    `INSERT INTO pedidos (nombres,fecha,mensaje,plan,diseno,email,telefono,estado)
     VALUES (?,?,?,?,?,?,?,'pendiente')`,
    [nombres,fecha,mensaje||'',plan,diseno,email||'',telefono||''],
    function(err) {
      if (err) return res.status(500).json({ error:'Error al guardar pedido' });
      res.json({ success:true, pedidoId:this.lastID });
    }
  );
});

/* ══════════════════════════════════════════
   API — REGISTRO
══════════════════════════════════════════ */
app.post('/api/auth/registro', async (req, res) => {
  try {
    if (rateLimit('reg_'+(req.ip||'x'), 5, 3600000))
      return res.status(429).json({ ok:false, message:'Demasiados intentos. Espera un momento.' });

    const nombre   = ((req.body.nombre||'')+' '+(req.body.apellido||'')).trim();
    const email    = (req.body.email||'').trim().toLowerCase();
    const telefono = (req.body.telefono||'').trim();
    const password =  req.body.password||'';

    if (!nombre || nombre.length < 2)
      return res.status(400).json({ ok:false, code:'VALIDATION', message:'Nombre inválido',
        errors:[{field:'nombre',message:'Ingresa tu nombre'}] });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return res.status(400).json({ ok:false, code:'VALIDATION', message:'Correo inválido',
        errors:[{field:'email',message:'Correo electrónico inválido'}] });
    if (!password || password.length < 8)
      return res.status(400).json({ ok:false, code:'VALIDATION', message:'Contraseña muy corta',
        errors:[{field:'password',message:'Mínimo 8 caracteres'}] });

    const existe = await dbGet('SELECT id FROM usuarios WHERE email=?', [email]);
    if (existe)
      return res.status(409).json({ ok:false, code:'EMAIL_EXISTS',
        message:'Este correo ya está registrado',
        errors:[{field:'email',message:'Este correo ya está registrado'}] });

    const hash = await bcrypt.hash(password, 12);
    const id   = uid();
    await dbRun('INSERT INTO usuarios (id,nombre,email,telefono,password_hash) VALUES (?,?,?,?,?)',
      [id, nombre, email, telefono, hash]);

    const user  = await dbGet('SELECT * FROM usuarios WHERE id=?', [id]);
    const token = makeJWT(user);

    // Enviar correo de bienvenida (async — no bloquea la respuesta)
    sendMail(email, '¡Bienvenido a InvitArte! 🎉', emailBienvenida(nombre.split(' ')[0]))
      .catch(e => console.error('Error email bienvenida:', e.message));

    return res.status(201).json({ ok:true, accessToken:token, user:safeUser(user) });

  } catch (err) {
    console.error('Error registro:', err);
    return res.status(500).json({ ok:false, message:'Error interno del servidor' });
  }
});

/* ══════════════════════════════════════════
   API — LOGIN
══════════════════════════════════════════ */
app.post('/api/auth/login', async (req, res) => {
  try {
    if (rateLimit('login_'+(req.ip||'x'), 10, 900000))
      return res.status(429).json({ ok:false, message:'Demasiados intentos. Espera 15 minutos.' });

    const email    = (req.body.email||'').trim().toLowerCase();
    const password =  req.body.password||'';

    if (!email || !password)
      return res.status(400).json({ ok:false, message:'Correo o contraseña incorrectos' });

    const user = await dbGet('SELECT * FROM usuarios WHERE email=?', [email]);
    const hashFake = '$2a$12$GzHi5V4.y3qBJNGGAkV7MOXXn9g0YrBG0XN4PtTfwfMUZoTfZ0zYO';
    const hashReal = user ? user.password_hash : hashFake;
    const valid    = await bcrypt.compare(password, hashReal);

    if (!user || !valid || !user.activo) {
      if (user) {
        const n = (user.intentos||0)+1;
        const b = n>=5 ? new Date(Date.now()+15*60000).toISOString() : null;
        await dbRun('UPDATE usuarios SET intentos=?,bloqueado_hasta=? WHERE id=?',[n,b,user.id]);
      }
      return res.status(401).json({ ok:false, message:'Correo o contraseña incorrectos' });
    }

    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
      const min = Math.ceil((new Date(user.bloqueado_hasta)-Date.now())/60000);
      return res.status(429).json({ ok:false, message:`Cuenta bloqueada. Intenta en ${min} min.` });
    }

    await dbRun('UPDATE usuarios SET intentos=0,bloqueado_hasta=NULL WHERE id=?',[user.id]);
    const token = makeJWT(user);
    return res.json({ ok:true, accessToken:token, user:safeUser(user) });

  } catch (err) {
    console.error('Error login:', err);
    return res.status(500).json({ ok:false, message:'Error interno del servidor' });
  }
});

/* ══════════════════════════════════════════
   API — LOGOUT
══════════════════════════════════════════ */
app.post('/api/auth/logout', (req,res) => res.json({ ok:true }));

/* ══════════════════════════════════════════
   API — SOLICITAR RESET
══════════════════════════════════════════ */
app.post('/api/auth/solicitar-reset', async (req, res) => {
  try {
    if (rateLimit('reset_'+(req.ip||'x'), 3, 3600000))
      return res.status(429).json({ ok:false, message:'Demasiadas solicitudes. Espera una hora.' });

    const email = (req.body.email||'').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return res.status(400).json({ ok:false, message:'Correo inválido' });

    const user = await dbGet('SELECT id,nombre,email FROM usuarios WHERE email=?',[email]);

    // Respuesta SIEMPRE igual (anti user-enumeration)
    const respuesta = { ok:true, message:'Si ese correo está registrado, recibirás las instrucciones.' };

    if (user) {
      await dbRun('UPDATE tokens_reset SET usado=1 WHERE usuario_id=?',[user.id]);
      const token     = randTok();
      const tokenHash = hTok(token);
      const expires   = new Date(Date.now()+2*3600000).toISOString();

      await dbRun('INSERT INTO tokens_reset (usuario_id,token_hash,expires_at) VALUES (?,?,?)',
        [user.id, tokenHash, expires]);

      // Enviar correo de reset
      await sendMail(email, 'Recupera tu contraseña — InvitArte',
        emailReset(user.nombre.split(' ')[0], token));

      // En desarrollo también mostrar el token en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n🔑 [DEV] Token de reset para ${email}: ${token}`);
        console.log(`   Link: ${BASE_URL}/recuperar.html?token=${token}\n`);
        respuesta._devToken = token; // Para pruebas locales
      }
    }

    return res.json(respuesta);

  } catch (err) {
    console.error('Error solicitar-reset:', err);
    return res.status(500).json({ ok:false, message:'Error interno del servidor' });
  }
});

/* ══════════════════════════════════════════
   API — RESET PASSWORD
══════════════════════════════════════════ */
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8)
      return res.status(400).json({ ok:false, message:'Datos incompletos o contraseña muy corta' });

    const tokenHash = hTok(token);
    const registro  = await dbGet(
      'SELECT * FROM tokens_reset WHERE token_hash=? AND usado=0', [tokenHash]);

    if (!registro || new Date(registro.expires_at) < new Date())
      return res.status(400).json({ ok:false, message:'El enlace expiró o ya fue utilizado' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await dbRun('UPDATE usuarios SET password_hash=?,intentos=0,bloqueado_hasta=NULL WHERE id=?',
      [newHash, registro.usuario_id]);
    await dbRun('UPDATE tokens_reset SET usado=1 WHERE id=?',[registro.id]);

    return res.json({ ok:true, message:'Contraseña actualizada correctamente.' });

  } catch (err) {
    console.error('Error reset-password:', err);
    return res.status(500).json({ ok:false, message:'Error interno del servidor' });
  }
});

/* ══════════════════════════════════════════
   API — ME (perfil)
══════════════════════════════════════════ */
function authMW(req, res, next) {
  const h = req.headers['authorization']||'';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ ok:false, message:'No autenticado' });
  try { req.user = jwt.verify(t, JWT_SECRET, { algorithms:['HS256'] }); next(); }
  catch { return res.status(401).json({ ok:false, message:'Sesión inválida' }); }
}

app.get('/api/auth/me', authMW, async (req, res) => {
  const user = await dbGet('SELECT * FROM usuarios WHERE id=?',[req.user.sub]);
  if (!user) return res.status(404).json({ ok:false, message:'Usuario no encontrado' });
  res.json({ ok:true, user:safeUser(user) });
});

/* ══════════════════════════════════════════
   ARRANCAR SERVIDOR
══════════════════════════════════════════ */
app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
  console.log(`   Email: ${GMAIL_USER && !GMAIL_USER.includes('tu.email') ? '✅ ' + GMAIL_USER : '⚠  Sin configurar (modo consola)'}`);
});
