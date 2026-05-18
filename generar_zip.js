// generar_zip.js
// Genera un proyecto "wedding-invites" completo + admin + stripe + contact + zip
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const root = 'wedding-invites';
const publicDir = path.join(root, 'public');
const dataDir = path.join(root, 'data');
const adminDir = path.join(publicDir, 'admin');

// util
function ensure(dir){
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Crear estructura básica
ensure(publicDir);
ensure(dataDir);
ensure(adminDir);

// --------------------
// package.json
// --------------------
const packageJson = {
  name: "wedding-invites",
  version: "1.0.0",
  scripts: {
    start: "node server.js",
    dev: "nodemon server.js"
  },
  dependencies: {
    express: "^4.18.2",
    stripe: "^12.0.0",
    dotenv: "^16.0.0",
    nodemailer: "^6.9.4",
    "express-session": "^1.17.3",
    "multer": "^1.4.5",
    "body-parser": "^1.20.2"
  },
  devDependencies: {
    nodemon: "^2.0.0",
    archiver: "^5.3.1"
  }
};
fs.writeFileSync(path.join(root,'package.json'), JSON.stringify(packageJson, null, 2));

// --------------------
// .env.example
// --------------------
const envExample = `# Copia a .env y rellena con tus valores
PORT=4242
BASE_URL=http://localhost:4242

# Stripe (pruebas)
STRIPE_SECRET_KEY=sk_test_REEMPLAZAR
STRIPE_PUBLISHABLE_KEY=pk_test_REEMPLAZAR

# Admin
ADMIN_PASSWORD=admin1234

# Gmail para enviar contactos (se recomienda usar App Password)
GMAIL_USER=tu.email@gmail.com
GMAIL_PASS=tu_app_password
GMAIL_TO=tu.email@gmail.com
`;
fs.writeFileSync(path.join(root,'.env.example'), envExample);
fs.writeFileSync(path.join(root,'.env'), envExample); // incluyo .env para opción 1 (vacío, editar)

// --------------------
// Data inicial (JSON)
// --------------------
const templates = [
  { id: "tpl1", title: "Tradicional Elegante", description: "Clásico, tipografía serif y tonos pastel.", price_standard: 45000, price_premium: 90000, img: "https://picsum.photos/seed/tpl1/800/1200" },
  { id: "tpl2", title: "Moderno Minimalista", description: "Líneas limpias y tipografía moderna.", price_standard: 45000, price_premium: 90000, img: "https://picsum.photos/seed/tpl2/800/1200" },
  { id: "tpl3", title: "Boho Chic", description: "Estilo bohemio y elementos naturales.", price_standard: 45000, price_premium: 90000, img: "https://picsum.photos/seed/tpl3/800/1200" },
  { id: "tpl4", title: "Acuarela Floral", description: "Ilustraciones en acuarela, romántico.", price_standard: 45000, price_premium: 90000, img: "https://picsum.photos/seed/tpl4/800/1200" }
];
fs.writeFileSync(path.join(dataDir, 'templates.json'), JSON.stringify(templates, null, 2));
fs.writeFileSync(path.join(dataDir, 'orders.json'), JSON.stringify([], null, 2));

// --------------------
// PUBLIC: index.html (inicio)
// --------------------
const indexHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>InvitArte — Invitaciones de boda</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <div class="container nav-wrap">
      <a class="logo" href="index.html">InvitArte</a>
      <button class="btn-burger" id="burger">☰</button>
      <ul class="nav-links" id="nav-links">
        <li><a href="index.html" class="active">Inicio</a></li>
        <li><a href="muestras.html">Muestras</a></li>
        <li><a href="precios.html">Precios</a></li>
        <li><a href="contacto.html">Contacto</a></li>
        <li><a href="catalogo.html" class="btn primary">Comprar</a></li>
      </ul>
    </div>
  </nav>

  <header class="hero">
    <div class="container hero-inner">
      <h1>Invitaciones digitales para tu boda</h1>
      <p class="lead">Diseños hermosos, personalizados y listos para compartir. Elige, personaliza y paga en línea.</p>
      <div class="hero-cta">
        <a href="catalogo.html" class="btn primary">Ver catálogo</a>
        <a href="muestras.html" class="btn">Ver muestras</a>
      </div>
    </div>
  </header>

  <main class="container">
    <section class="features">
      <div class="feature">
        <h3>Diseños Profesionales</h3>
        <p>Plantillas creadas por diseñadores — edición fácil.</p>
      </div>
      <div class="feature">
        <h3>Entrega Rápida</h3>
        <p>Recibe tu invitación lista para compartir en 24-72 hrs.</p>
      </div>
      <div class="feature">
        <h3>Pago Seguro</h3>
        <p>Paga con Stripe (MXN). Tarjetas seguras y confiables.</p>
      </div>
    </section>

    <section class="preview-section">
      <h2>Muestras destacadas</h2>
      <div id="preview-grid" class="grid"></div>
      <div class="center">
        <a href="muestras.html" class="btn">Ver todas las muestras</a>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container">
      <div>© 2025 InvitArte</div>
      <div class="small">Diseños temporales de stock — puedes reemplazarlos en el panel de administración.</div>
    </div>
  </footer>

  <script src="app-front.js"></script>
</body>
</html>`;
fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml);

// --------------------
// PUBLIC: muestras.html
// --------------------
const muestras = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Muestras — InvitArte</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Navbar -->
  <nav class="navbar">
    <div class="container nav-wrap">
      <a class="logo" href="index.html">InvitArte</a>
      <button class="btn-burger" id="burger-2">☰</button>
      <ul class="nav-links" id="nav-links-2">
        <li><a href="index.html">Inicio</a></li>
        <li><a href="muestras.html" class="active">Muestras</a></li>
        <li><a href="precios.html">Precios</a></li>
        <li><a href="contacto.html">Contacto</a></li>
        <li><a href="catalogo.html" class="btn primary">Comprar</a></li>
      </ul>
    </div>
  </nav>

  <main class="container">
    <h1>Muestras de diseño</h1>
    <p class="lead">Explora los estilos disponibles. Haz click para ver en tamaño completo.</p>
    <div id="samples-grid" class="grid samples-grid"></div>
  </main>

  <footer class="footer">
    <div class="container">© 2025 InvitArte</div>
  </footer>

  <script src="app-front.js"></script>
</body>
</html>`;
fs.writeFileSync(path.join(publicDir, 'muestras.html'), muestras);

// --------------------
// PUBLIC: precios.html
// --------------------
const precios = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Precios — InvitArte</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <div class="container nav-wrap">
      <a class="logo" href="index.html">InvitArte</a>
      <ul class="nav-links">
        <li><a href="index.html">Inicio</a></li>
        <li><a href="muestras.html">Muestras</a></li>
        <li><a href="precios.html" class="active">Precios</a></li>
        <li><a href="contacto.html">Contacto</a></li>
        <li><a href="catalogo.html" class="btn primary">Comprar</a></li>
      </ul>
    </div>
  </nav>

  <main class="container">
    <h1>Precios</h1>
    <div class="price-grid">
      <div class="price-card">
        <h3>Estándar</h3>
        <div class="price-amount">450.00 <span class="small">MXN</span></div>
        <ul>
          <li>Plantilla profesional</li>
          <li>Personalización básica</li>
          <li>Entrega: 24-72 horas</li>
        </ul>
        <a href="catalogo.html" class="btn primary">Elegir Estándar</a>
      </div>

      <div class="price-card featured">
        <h3>Premium</h3>
        <div class="price-amount">900.00 <span class="small">MXN</span></div>
        <ul>
          <li>Diseño avanzado</li>
          <li>Personalización completa</li>
          <li>Animación y música</li>
        </ul>
        <a href="catalogo.html" class="btn primary">Elegir Premium</a>
      </div>
    </div>
  </main>

  <footer class="footer">
    <div class="container">© 2025 InvitArte</div>
  </footer>

  <script src="app-front.js"></script>
</body>
</html>`;
fs.writeFileSync(path.join(publicDir, 'precios.html'), precios);

// --------------------
// PUBLIC: contacto.html (con POST a /api/contact)
// --------------------
const contacto = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Contacto — InvitArte</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <div class="container nav-wrap">
      <a class="logo" href="index.html">InvitArte</a>
      <ul class="nav-links">
        <li><a href="index.html">Inicio</a></li>
        <li><a href="muestras.html">Muestras</a></li>
        <li><a href="precios.html">Precios</a></li>
        <li><a href="contacto.html" class="active">Contacto</a></li>
        <li><a href="catalogo.html" class="btn primary">Comprar</a></li>
      </ul>
    </div>
  </nav>

  <main class="container">
    <h1>Contacto</h1>
    <p class="lead">Escríbenos y te responderemos lo antes posible.</p>

    <form id="contactForm" class="contact-form">
      <label>Nombre</label>
      <input name="name" required>

      <label>Email</label>
      <input name="email" type="email" required>

      <label>Mensaje</label>
      <textarea name="message" rows="6" required></textarea>

      <button class="btn primary" type="submit">Enviar</button>
      <div id="contactMsg" class="small"></div>
    </form>
  </main>

  <footer class="footer">
    <div class="container">© 2025 InvitArte</div>
  </footer>

  <script>
    document.getElementById('contactForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = {
        name: form.name.value,
        email: form.email.value,
        message: form.message.value
      };
      const btn = form.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      try {
        const r = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await r.json();
        document.getElementById('contactMsg').textContent = json.message || 'Enviado';
        form.reset();
      } catch (err) {
        document.getElementById('contactMsg').textContent = 'Error enviando mensaje';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar';
      }
    });
  </script>
</body>
</html>`;
fs.writeFileSync(path.join(publicDir, 'contacto.html'), contacto);

// --------------------
// PUBLIC: catalogo.html (compra / carrito)
// --------------------
const catalogo = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Catálogo — InvitArte</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <div class="container nav-wrap">
      <a class="logo" href="index.html">InvitArte</a>
      <ul class="nav-links">
        <li><a href="index.html">Inicio</a></li>
        <li><a href="muestras.html">Muestras</a></li>
        <li><a href="precios.html">Precios</a></li>
        <li><a href="contacto.html">Contacto</a></li>
        <li><a href="catalogo.html" class="btn primary active">Comprar</a></li>
      </ul>
    </div>
  </nav>

  <main class="container shop-grid">
    <section class="catalog">
      <h1>Catálogo</h1>
      <div id="cards" class="grid"></div>
    </section>

    <aside class="cart" id="cartPanel">
      <h3>Tu selección</h3>
      <div id="cartItems"></div>
      <div class="cart-footer">
        <label>Email (opcional)</label>
        <input id="custEmail" type="email" placeholder="cliente@ejemplo.com" />
        <div id="cartTotal" class="price-total">Total: $0.00 MXN</div>
        <button id="checkoutBtn" class="btn primary" disabled>Pagar con Stripe</button>
      </div>
    </aside>
  </main>

<script src="app-shop.js"></script>
</body>
</html>`;
fs.writeFileSync(path.join(publicDir, 'catalogo.html'), catalogo);

// --------------------
// PUBLIC: success.html
// --------------------
const successHtml = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Pago Exitoso</title><link rel="stylesheet" href="styles.css"></head><body>
  <main class="container centered">
    <h1>¡Gracias! 🎉</h1>
    <p>Hemos recibido tu pago. Revisaremos el pedido y te contactaremos si es necesario.</p>
    <a class="btn" href="index.html">Volver al inicio</a>
  </main>
</body></html>`;
fs.writeFileSync(path.join(publicDir, 'success.html'), successHtml);

// --------------------
// PUBLIC: Admin UI (simple) - admin/login.html + admin/dashboard.html
// --------------------
const adminLogin = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Admin Login</title><link rel="stylesheet" href="../styles.css"></head><body>
  <main class="container centered">
    <h2>Admin — Iniciar sesión</h2>
    <form id="frm">
      <input id="pw" type="password" placeholder="Contraseña" required />
      <button class="btn primary" type="submit">Entrar</button>
      <div id="msg" class="small"></div>
    </form>
  </main>
<script>
document.getElementById('frm').addEventListener('submit', async e => {
  e.preventDefault();
  const pw = document.getElementById('pw').value;
  const res = await fetch('/admin/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ password: pw })
  });
  const j = await res.json();
  if(j.ok) location.href = '/admin/dashboard.html';
  else document.getElementById('msg').textContent = j.message || 'Error';
});
</script>
</body></html>`;
fs.writeFileSync(path.join(adminDir, 'login.html'), adminLogin);

const adminDashboard = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Admin Dashboard</title><link rel="stylesheet" href="../styles.css"></head><body>
<nav class="navbar"><div class="container nav-wrap"><a class="logo" href="/index.html">InvitArte</a><ul class="nav-links"><li><a href="/admin/dashboard.html" class="active">Dashboard</a></li><li><a href="/admin/login.html" id="logoutLink">Cerrar sesión</a></li></ul></div></nav>
<main class="container">
  <h1>Panel de administración</h1>

  <section>
    <h2>Plantillas</h2>
    <div id="tplList"></div>
    <h3>Agregar plantilla</h3>
    <form id="addTpl">
      <input name="title" placeholder="Título" required />
      <input name="description" placeholder="Descripción" required />
      <input name="img" placeholder="URL imagen" required />
      <button class="btn primary" type="submit">Agregar</button>
    </form>
  </section>

  <section>
    <h2>Órdenes</h2>
    <div id="orders"></div>
  </section>
</main>

<script>
async function loadTemplates(){
  const r = await fetch('/api/templates');
  const tpl = await r.json();
  const el = document.getElementById('tplList');
  el.innerHTML = '';
  tpl.forEach(t => {
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = '<strong>'+t.title+'</strong><div class="small">'+t.description+'</div><img src="'+t.img+'" style="max-width:180px;margin-top:8px"/><div style="margin-top:6px"><button class="btn" data-id="'+t.id+'" onclick="delTpl(\\''+t.id+'\\')">Eliminar</button></div>';
    el.appendChild(d);
  });
}

async function loadOrders(){
  const r = await fetch('/api/orders');
  const ord = await r.json();
  const el = document.getElementById('orders');
  el.innerHTML = '';
  ord.forEach(o=>{
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = '<div><strong>Pedido</strong> - '+o.id+' <div class="small">Correo: '+(o.email||'—')+'</div></div><div style="margin-top:8px">Total: $'+(o.total/100).toFixed(2)+' MXN</div><div class="small">Stripe session: '+(o.sessionId||'—')+'</div>';
    el.appendChild(d);
  });
}

async function delTpl(id){
  await fetch('/api/templates/'+id,{ method: 'DELETE' });
  loadTemplates();
}

document.getElementById('addTpl').addEventListener('submit', async e=> {
  e.preventDefault();
  const f= e.target;
  const body = { title: f.title.value, description: f.description.value, img: f.img.value };
  await fetch('/api/templates', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  f.reset();
  loadTemplates();
});

document.getElementById('logoutLink').addEventListener('click', async (e) => {
  // clear session by hitting logout endpoint
  e.preventDefault();
  await fetch('/admin/logout', { method: 'POST' });
  location.href = '/admin/login.html';
});

loadTemplates();
loadOrders();
</script>
</body></html>`;
fs.writeFileSync(path.join(adminDir, 'dashboard.html'), adminDashboard);

// --------------------
// PUBLIC: styles.css (responsive)
// --------------------
const css = `:root{
  --accent:#b66dff;
  --muted:#6b7280;
  --bg:#f7f7fb;
  --card:#ffffff;
  --maxw:1100px;
  --gap:18px;
}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial;color:#111;background:var(--bg);-webkit-font-smoothing:antialiased}
.container{max-width:var(--maxw);margin:0 auto;padding:20px}
.navbar{background:#fff;box-shadow:0 6px 18px rgba(20,20,40,0.04);position:sticky;top:0;z-index:40}
.nav-wrap{display:flex;align-items:center;justify-content:space-between;gap:12px}
.logo{font-weight:800;color:var(--accent);text-decoration:none;font-size:1.1rem}
.nav-links{display:flex;align-items:center;gap:12px;list-style:none;margin:0;padding:0}
.nav-links a{text-decoration:none;color:#111;padding:8px 10px;border-radius:8px}
.nav-links a.active{background:linear-gradient(90deg,var(--accent),#6fd3ff);color:white}
.btn{display:inline-block;padding:8px 12px;border-radius:8px;border:0;background:#eee;cursor:pointer;text-decoration:none;color:inherit}
.btn.primary{background:var(--accent);color:white;font-weight:700}
.btn-burger{display:none;background:transparent;border:0;font-size:1.2rem;padding:6px}

.hero{background:linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.25)), url('https://picsum.photos/seed/wedding/1600/900') center/cover no-repeat;color:white;padding:80px 20px;text-align:center}
.hero h1{font-size:2.2rem;margin:0}
.lead{margin-top:10px;color:rgba(255,255,255,0.9)}
.hero-cta{margin-top:18px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}

.features{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--gap);margin-top:24px}
.feature{background:var(--card);padding:18px;border-radius:12px;box-shadow:0 8px 22px rgba(20,20,40,0.04)}

.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px;margin-top:14px}
.card{background:var(--card);padding:14px;border-radius:12px;box-shadow:0 10px 20px rgba(20,20,40,0.05)}
.samples-grid img{width:100%;height:auto;border-radius:10px;display:block}

.price-grid{display:flex;gap:18px;flex-wrap:wrap}
.price-card{background:var(--card);padding:18px;border-radius:12px;flex:1;min-width:240px}
.price-card.featured{border:2px solid var(--accent)}

.shop-grid{display:grid;grid-template-columns:1fr 360px;gap:18px;padding:20px}
.catalog{min-height:200px}
.cart{background:var(--card);padding:12px;border-radius:12px;position:sticky;top:90px}
.cart-footer{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.price-total{font-weight:700;margin-top:8px}

footer.footer{background:#0f1724;color:white;padding:14px;margin-top:36px;border-top-left-radius:12px;border-top-right-radius:12px}
.centered{text-align:center;padding:60px 20px}

/* responsive */
@media (max-width:1000px){
  .features{grid-template-columns:1fr}
  .shop-grid{grid-template-columns:1fr}
  .nav-links{display:none}
  .btn-burger{display:block}
}
@media (max-width:600px){
  .hero h1{font-size:1.5rem}
  .features{grid-template-columns:1fr}
}
.small{color:var(--muted);font-size:0.9rem}
`;
fs.writeFileSync(path.join(publicDir, 'styles.css'), css);

// --------------------
// PUBLIC: app-front.js (load previews and templates)
// --------------------
const appFront = `// app-front.js
async function fetchTemplates(){
  const res = await fetch('/api/templates');
  return await res.json();
}

async function initFront(){
  const templates = await fetchTemplates();
  const grid = document.getElementById('preview-grid');
  if(grid){
    grid.innerHTML = '';
    templates.slice(0,3).forEach(t=>{
      const d = document.createElement('div');
      d.className = 'card';
      d.innerHTML = '<img src="'+t.img+'" style="width:100%;border-radius:8px"/><h4>'+t.title+'</h4><div class="small">'+t.description+'</div>';
      grid.appendChild(d);
    });
  }
  const samples = document.getElementById('samples-grid');
  if(samples){
    samples.innerHTML = '';
    templates.forEach(t=>{
      const img = document.createElement('img');
      img.src = t.img;
      img.alt = t.title;
      samples.appendChild(img);
    });
  }
}
document.addEventListener('DOMContentLoaded', initFront);

// burger
document.addEventListener('click', (e) => {
  if(e.target.id === 'burger' || e.target.id === 'burger-2'){
    const id = e.target.id === 'burger' ? 'nav-links' : 'nav-links-2';
    const el = document.getElementById(id);
    if(el) el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
  }
});
`;
fs.writeFileSync(path.join(publicDir, 'app-front.js'), appFront);

// --------------------
// PUBLIC: app-shop.js (catalog + cart + checkout)
const appShop = `// app-shop.js
let TEMPLATES = [];
let CART = [];

async function loadTemplates(){
  const res = await fetch('/api/templates');
  TEMPLATES = await res.json();
  renderCatalog();
}

function formatMXN(cents){
  return (cents/100).toFixed(2).replace('.',',');
}

function renderCatalog(){
  const container = document.getElementById('cards');
  container.innerHTML = '';
  TEMPLATES.forEach(t=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<img src="'+t.img+'" style="width:100%;height:260px;object-fit:cover;border-radius:8px"/><h4>'+t.title+'</h4><div class="small">'+t.description+'</div><div class="small">Estándar $'+formatMXN(t.price_standard)+' · Premium $'+formatMXN(t.price_premium)+'</div><div style="margin-top:8px"><select data-id="'+t.id+'"><option value="standard" data-price="'+t.price_standard+'">Estándar</option><option value="premium" data-price="'+t.price_premium+'">Premium</option></select><button class="btn" data-id="'+t.id+'">Agregar</button></div>';
    container.appendChild(card);
  });
  // attach events
  container.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', (e)=>{
      const id = e.currentTarget.dataset.id;
      const sel = document.querySelector('select[data-id="'+id+'"]');
      const plan = sel.value;
      const price = parseInt(sel.selectedOptions[0].dataset.price, 10);
      addToCart({ id, title: TEMPLATES.find(x=>x.id===id).title, plan, amount: price, quantity: 1 });
    });
  });
}

function addToCart(item){
  const key = item.id + '::' + item.plan;
  const found = CART.find(c=> c.id+'::'+c.plan === key);
  if(found) found.quantity++;
  else CART.push(item);
  renderCart();
}

function changeQty(i, delta){
  CART[i].quantity = Math.max(1, CART[i].quantity + delta);
  renderCart();
}

function removeFromCart(i){
  CART.splice(i,1);
  renderCart();
}

function renderCart(){
  const el = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  const btn = document.getElementById('checkoutBtn');
  el.innerHTML = '';
  if(CART.length === 0){
    el.innerHTML = '<div class="small">Carrito vacío</div>';
    totalEl.textContent = 'Total: $0.00 MXN';
    btn.disabled = true;
    return;
  }
  let total = 0;
  CART.forEach((it,i)=>{
    const div = document.createElement('div');
    div.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>'+it.title+'</strong><div class="small">'+it.plan+' · $'+formatMXN(it.amount)+'</div></div><div><button class="btn" onclick="changeQty('+i+','+-1+')">-</button><span style="padding:0 8px">'+it.quantity+'</span><button class="btn" onclick="changeQty('+i+',1)">+</button><div style="margin-top:8px"><button class="btn" onclick="removeFromCart('+i+')">Eliminar</button></div></div></div>';
    el.appendChild(div);
    total += it.amount * it.quantity;
  });
  totalEl.textContent = 'Total: $' + formatMXN(total) + ' MXN';
  btn.disabled = false;
  // Attach checkout
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = 'Redirigiendo...';
    const email = document.getElementById('custEmail').value || undefined;
    const resp = await fetch('/create-checkout-session', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ items: CART, customerEmail: email })
    });
    const json = await resp.json();
    if(json.url){
      // store order locally too (server will save)
      window.location = json.url;
    } else {
      alert('Error iniciando pago');
      btn.disabled = false; btn.textContent = 'Pagar con Stripe';
    }
  };
}

window.changeQty = changeQty;
window.removeFromCart = removeFromCart;

loadTemplates();
`;
fs.writeFileSync(path.join(publicDir, 'app-shop.js'), appShop);

// --------------------
// SERVER: server.js (Express + Stripe + nodemailer + admin sessions)
// --------------------
const server = `require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const dataDir = path.join(__dirname, 'data');
const templatesFile = path.join(dataDir, 'templates.json');
const ordersFile = path.join(dataDir, 'orders.json');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');
const BASE_URL = process.env.BASE_URL || 'http://localhost:4242';

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000*60*60 }
}));

// Helpers
function readJSON(p){ try { return JSON.parse(fs.readFileSync(p)); } catch(e){ return null; } }
function writeJSON(p,d){ fs.writeFileSync(p, JSON.stringify(d, null, 2)); }

// API: templates
app.get('/api/templates', (req,res) => {
  const tpl = readJSON(templatesFile) || [];
  res.json(tpl);
});

app.post('/api/templates', (req,res) => {
  // protected: admin session
  if(!req.session?.isAdmin) return res.status(401).json({ error: 'unauthorized' });
  const tpl = readJSON(templatesFile) || [];
  const id = 'tpl' + (Date.now().toString(36));
  const obj = { id, title: req.body.title, description: req.body.description, img: req.body.img, price_standard: 45000, price_premium: 90000 };
  tpl.push(obj);
  writeJSON(templatesFile, tpl);
  res.json({ ok: true });
});

app.delete('/api/templates/:id', (req,res) => {
  if(!req.session?.isAdmin) return res.status(401).json({ error: 'unauthorized' });
  let tpl = readJSON(templatesFile) || [];
  tpl = tpl.filter(t=>t.id !== req.params.id);
  writeJSON(templatesFile, tpl);
  res.json({ ok: true });
});

// Orders
app.get('/api/orders', (req,res) => {
  if(!req.session?.isAdmin) return res.status(401).json({ error: 'unauthorized' });
  const orders = readJSON(ordersFile) || [];
  res.json(orders);
});

app.post('/create-checkout-session', async (req,res) => {
  try {
    const { items, customerEmail } = req.body;
    if(!items || !items.length) return res.status(400).json({ error: 'no items' });

    const line_items = items.map(i => ({
      price_data: {
        currency: 'mxn',
        product_data: { name: i.title + ' — ' + i.plan },
        unit_amount: i.amount
      },
      quantity: i.quantity
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: customerEmail || undefined,
      success_url: \`\${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}\`,
      cancel_url: \`\${BASE_URL}/catalogo.html\`
    });

    // Save order locally (pending)
    const orders = readJSON(ordersFile) || [];
    const total = items.reduce((s,it)=> s + it.amount * it.quantity, 0);
    const order = { id: 'ord_'+Date.now().toString(36), sessionId: session.id, items, total, email: customerEmail || null, createdAt: new Date().toISOString(), status: 'pending' };
    orders.push(order);
    writeJSON(ordersFile, orders);

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'stripe error' });
  }
});

// Contact endpoint -> envia mail via nodemailer
app.post('/api/contact', async (req,res) => {
  const { name, email, message } = req.body;
  if(!name || !email || !message) return res.status(400).json({ message: 'missing fields' });

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });

    const mail = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_TO || process.env.GMAIL_USER,
      subject: 'Contacto web - InvitArte - ' + name,
      text: \`Nombre: \${name}\\nEmail: \${email}\\nMensaje:\\n\${message}\`
    };

    await transporter.sendMail(mail);
    res.json({ message: 'Mensaje enviado, gracias' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error enviando correo' });
  }
});

// Admin login/logout
app.post('/admin/login', (req,res) => {
  const pw = req.body.password;
  if(pw && pw === process.env.ADMIN_PASSWORD){
    req.session.isAdmin = true;
    return res.json({ ok:true });
  }
  res.json({ ok:false, message: 'Contraseña incorrecta' });
});
app.post('/admin/logout', (req,res) => {
  req.session.destroy(()=>res.json({ ok:true }));
});

// Simple route to refresh order statuses (optional)
app.get('/admin/refresh-orders', async (req,res)=>{
  if(!req.session?.isAdmin) return res.status(401).json({ error: 'unauthorized' });
  const orders = readJSON(ordersFile) || [];
  for (let o of orders){
    try {
      const sess = await stripe.checkout.sessions.retrieve(o.sessionId);
      o.payment_status = sess.payment_status;
      if(sess.payment_status === 'paid') o.status = 'paid';
    } catch(e){
      // ignore
    }
  }
  writeJSON(ordersFile, orders);
  res.json({ ok:true });
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, ()=> console.log('Server listening on http://localhost:' + PORT));
`;
fs.writeFileSync(path.join(root, 'server.js'), server);

// --------------------
// FIN: empaquetar zip
// --------------------
const output = fs.createWriteStream('wedding-invites.zip');
const archive = archiver('zip', { zlib: { level: 9 } });
output.on('close', () => {
  console.log('ZIP creado exitosamente: wedding-invites.zip (' + archive.pointer() + ' bytes)');
});
archive.on('error', err => { throw err; });
archive.pipe(output);
archive.directory(root + '/', false);
archive.finalize();
console.log('Generando proyecto y ZIP...'); 
