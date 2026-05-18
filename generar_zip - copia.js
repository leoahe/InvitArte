// generar_zip.js
// Crea todo el proyecto wedding-invites y genera wedding-invites.zip

const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const base = path.join(__dirname, "wedding-invites");
const pub = path.join(base, "public");

// ---------------------------
// 1) Crear carpetas
// ---------------------------
fs.mkdirSync(pub, { recursive: true });

// ---------------------------
// 2) Crear archivos
// ---------------------------

const files = {
  [path.join(pub, "index.html")]: `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>InvitArte — Catálogo de Invitaciones</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header">
    <div class="container">
      <h1>InvitArte</h1>
      <p class="lead">Invitaciones digitales personalizadas para bodas</p>
    </div>
  </header>

  <main class="container">
    <section id="catalog">
      <h2>Catálogo de Diseños</h2>
      <div id="cards" class="cards-grid"></div>
    </section>

    <aside id="cart" class="cart">
      <h3>Carrito</h3>
      <div id="cart-items"></div>

      <div class="cart-footer">
        <label for="email">Correo (opcional):</label>
        <input id="email" type="email" placeholder="cliente@ejemplo.com" />
        <button id="checkoutBtn" class="btn primary" disabled>Pagar</button>
      </div>
    </aside>
  </main>

  <footer class="site-footer">
    <div class="container">
      © 2025 InvitArte — Invitaciones digitales.
    </div>
  </footer>

  <script src="app.js"></script>
</body>
</html>`,

  [path.join(pub, "success.html")]: `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Pago Exitoso</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="container centered">
    <h2>¡Pago realizado con éxito! 🎉</h2>
    <p>Gracias por tu compra.</p>
    <a href="/" class="btn">Volver al catálogo</a>
  </main>
</body>
</html>`,

  [path.join(pub, "styles.css")]: `:root{
  --accent:#b66dff;
  --muted:#666;
  --bg:#faf8ff;
  --card:#ffffff;
  --maxw:1100px;
}
*{box-sizing:border-box}
body{
  margin:0;
  font-family:Inter, Arial, sans-serif;
  background:var(--bg);
  color:#222;
}
.container{max-width:var(--maxw);margin:0 auto;padding:20px}
.site-header{
  background:linear-gradient(90deg,var(--accent),#6fd3ff);
  color:white;padding:36px 0;margin-bottom:20px;
}
.cards-grid{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px
}
.card{
  background:var(--card);padding:14px;border-radius:10px;
  box-shadow:0 6px 18px rgba(20,20,40,0.06);
  display:flex;flex-direction:column;gap:8px;
}
.thumb{height:150px;border-radius:8px;background-size:cover;background-position:center}
.selector{display:flex;justify-content:space-between;margin-top:auto}
.btn{padding:10px 14px;border-radius:8px;border:0;background:#eee;cursor:pointer}
.btn.primary{background:var(--accent);color:white;font-weight:700}
.cart{
  position:fixed;right:20px;top:120px;width:300px;background:white;
  padding:14px;border-radius:10px;box-shadow:0 12px 30px rgba(10,10,30,0.08)
}
.cart-item{
  display:flex;justify-content:space-between;
  border-bottom:1px dashed #ddd;padding:6px 0
}
.small{font-size:0.88rem;color:var(--muted)}
.centered{display:flex;flex-direction:column;justify-content:center;align-items:center;height:70vh}
@media(max-width:900px){.cart{position:static;width:auto;margin-top:20px}}`,

  [path.join(pub, "app.js")]: `const CATALOG = [
  { id: 'tpl1', title: 'Tradicional Elegante', img: 'https://picsum.photos/seed/tpl1/800', price_standard: 8000, price_premium: 12000 },
  { id: 'tpl2', title: 'Moderno Minimalista', img: 'https://picsum.photos/seed/tpl2/800', price_standard: 7500, price_premium: 11500 },
  { id: 'tpl3', title: 'Boho Chic', img: 'https://picsum.photos/seed/tpl3/800', price_standard: 8500, price_premium: 13000 }
];

let cart = [];

function renderCatalog(){
  const cards = document.getElementById('cards');
  cards.innerHTML = '';
  CATALOG.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = \`
      <div class="thumb" style="background-image:url('\${p.img}')"></div>
      <h4>\${p.title}</h4>
      <div class="small">Estándar $ \${(p.price_standard/100).toFixed(2)} · Premium $ \${(p.price_premium/100).toFixed(2)}</div>
      <div class="selector">
        <select data-id="\${p.id}">
          <option value="standard" data-price="\${p.price_standard}">Estándar</option>
          <option value="premium" data-price="\${p.price_premium}">Premium</option>
        </select>
        <button class="btn add-btn" data-id="\${p.id}">Agregar</button>
      </div>\`;
    cards.appendChild(card);
  });

  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const sel = document.querySelector(\`select[data-id="\${id}"]\`);
      const plan = sel.value;
      const amount = Number(sel.selectedOptions[0].dataset.price);
      const title = CATALOG.find(x => x.id === id).title;
      addToCart({ id, title, plan, amount, quantity: 1 });
    };
  });
}

function renderCart(){
  const el = document.getElementById('cart-items');
  const checkoutBtn = document.getElementById('checkoutBtn');
  el.innerHTML = '';

  if(cart.length === 0){
    el.innerHTML = '<div class="small">Tu carrito está vacío.</div>';
    checkoutBtn.disabled = true;
    return;
  }

  cart.forEach((item, i) => {
    const d = document.createElement('div');
    d.className = 'cart-item';
    d.innerHTML = \`
      <div><strong>\${item.title}</strong><br><span class="small">\${item.plan}</span></div>
      <div>
        <button onclick="changeQty(\${i},-1)" class="btn">-</button>
        <span>\${item.quantity}</span>
        <button onclick="changeQty(\${i},1)" class="btn">+</button><br>
        <button onclick="removeFromCart(\${i})" class="btn">Eliminar</button>
      </div>\`;
    el.appendChild(d);
  });

  checkoutBtn.disabled = false;
}

function addToCart(i){
  const key = i.id + "-" + i.plan;
  const exist = cart.find(x => x.id+"-"+x.plan === key);
  if(exist) exist.quantity++;
  else cart.push(i);
  renderCart();
}

function changeQty(i, d){
  cart[i].quantity = Math.max(1, cart[i].quantity + d);
  renderCart();
}

function removeFromCart(i){
  cart.splice(i,1);
  renderCart();
}

document.getElementById('checkoutBtn').onclick = async () => {
  const email = document.getElementById('email').value;
  const res = await fetch('/create-checkout-session', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ items: cart, customerEmail: email })
  });
  const data = await res.json();
  if(data.url) window.location = data.url;
};

renderCatalog();
renderCart();`,

  [path.join(base, "server.js")]: `require('dotenv').config();
const express = require('express');
const path = require('path');
const Stripe = require('stripe');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, customerEmail } = req.body;

    const line_items = items.map(i => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: i.title + " — " + i.plan,
        },
        unit_amount: i.amount
      },
      quantity: i.quantity
    }));

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: 'payment',
      customer_email: customerEmail || undefined,
      success_url: \`\${process.env.BASE_URL}/success.html\`,
      cancel_url: \`\${process.env.BASE_URL}/\`
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creando sesión" });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () =>
  console.log("Servidor en http://localhost:" + PORT)
);`,

  [path.join(base, "package.json")]: `{
  "name": "wedding-invites",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "dotenv": "^16.0.0",
    "express": "^4.18.2",
    "stripe": "^12.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.0",
    "archiver": "^5.3.1"
  }
}`,

  [path.join(base, ".env")]: `STRIPE_SECRET_KEY=sk_test_REEMPLAZAR
BASE_URL=http://localhost:4242
PORT=4242`
};

// Guardar archivos
for (const filePath in files) {
  fs.writeFileSync(filePath, files[filePath]);
}

// ---------------------------
// 3) Generar ZIP
// ---------------------------
const zipFile = fs.createWriteStream("wedding-invites.zip");
const archive = archiver("zip");

archive.pipe(zipFile);
archive.directory("wedding-invites/", false);
archive.finalize();

console.log("ZIP creado: wedding-invites.zip");
