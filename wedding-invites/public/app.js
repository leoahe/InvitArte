const CATALOG = [
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
    card.innerHTML = `
      <div class="thumb" style="background-image:url('${p.img}')"></div>
      <h4>${p.title}</h4>
      <div class="small">Estándar $ ${(p.price_standard/100).toFixed(2)} · Premium $ ${(p.price_premium/100).toFixed(2)}</div>
      <div class="selector">
        <select data-id="${p.id}">
          <option value="standard" data-price="${p.price_standard}">Estándar</option>
          <option value="premium" data-price="${p.price_premium}">Premium</option>
        </select>
        <button class="btn add-btn" data-id="${p.id}">Agregar</button>
      </div>`;
    cards.appendChild(card);
  });

  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const sel = document.querySelector(`select[data-id="${id}"]`);
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
    d.innerHTML = `
      <div><strong>${item.title}</strong><br><span class="small">${item.plan}</span></div>
      <div>
        <button onclick="changeQty(${i},-1)" class="btn">-</button>
        <span>${item.quantity}</span>
        <button onclick="changeQty(${i},1)" class="btn">+</button><br>
        <button onclick="removeFromCart(${i})" class="btn">Eliminar</button>
      </div>`;
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
renderCart();