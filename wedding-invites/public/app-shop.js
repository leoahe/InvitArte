// app-shop.js
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
