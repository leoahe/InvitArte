require('dotenv').config();
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
      success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/catalogo.html`
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
      text: `Nombre: ${name}\nEmail: ${email}\nMensaje:\n${message}`
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
