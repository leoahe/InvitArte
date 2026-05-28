/**
 * INVITARTE — CHECKOUT.JS
 * Lógica del checkout:
 * - Selector de plan dinámico
 * - Cálculo en tiempo real (plan + extras + IVA)
 * - Stripe (frontend simulado, estructura lista para backend)
 * - MercadoPago (redirect flow simulado)
 * - OXXO voucher simulado
 * - Confirmación y actualización de plan en cuenta
 */

const IVA_RATE     = 0.16;
let selectedPlanId = 'premium';
let extraGuests    = 0;
let paymentMethod  = 'stripe';
let mpSubMethod    = null;
let currentUser    = null;

/* ── INIT ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  Loader.show();

  currentUser = await Auth.requireLogin('/login.html');
  if (!currentUser) return;

  // Read plan from URL
  const params = new URLSearchParams(window.location.search);
  const planParam = params.get('plan');
  if (planParam && PLANS[planParam]) selectedPlanId = planParam;

  // Build plan pills
  buildPlanSelector();

  // Initial calculation
  updateSummary();

  Navbar.init();
  Loader.hide();
});

/* ── BUILD PLAN SELECTOR ─────────────────── */
function buildPlanSelector() {
  const bar = document.getElementById('plan-selector');
  if (!bar) return;

  bar.innerHTML = Object.values(PLANS).map(plan => `
    <div class="plan-pill ${plan.id === selectedPlanId ? 'selected' : ''}"
         data-plan="${plan.id}"
         onclick="selectPlan('${plan.id}', this)">
      <div class="plan-pill__name">${plan.nombre}</div>
      <div class="plan-pill__price">$${plan.precio.toLocaleString()}</div>
      <div class="plan-pill__sub">${plan.invitadosIncluidos} invitados</div>
    </div>
  `).join('');
}

/* ── SELECT PLAN ─────────────────────────── */
window.selectPlan = (planId, el) => {
  selectedPlanId = planId;
  extraGuests    = 0;

  // Update pills UI
  document.querySelectorAll('.plan-pill').forEach(p => p.classList.remove('selected'));
  if (el) el.classList.add('selected');

  // Reset extras
  const qtyEl = document.getElementById('extras-qty');
  if (qtyEl) qtyEl.textContent = '0';

  updateSummary();
};

/* ── EXTRAS CALCULATOR ───────────────────── */
window.changeExtras = (delta) => {
  extraGuests = Math.max(0, extraGuests + delta);
  const qtyEl = document.getElementById('extras-qty');
  if (qtyEl) qtyEl.textContent = extraGuests;

  // Show per-guest price
  const plan = PLANS[selectedPlanId];
  if (plan) {
    const label = document.getElementById('extra-price-label');
    if (label) label.textContent = `$${plan.extraPorInvitado} MXN por invitado adicional`;
  }

  updateSummary();
};

/* ── UPDATE SUMMARY ──────────────────────── */
function updateSummary() {
  const plan = PLANS[selectedPlanId];
  if (!plan) return;

  const basePrice  = plan.precio;
  const extraCost  = extraGuests * plan.extraPorInvitado;
  const subtotal   = basePrice + extraCost;
  const iva        = Math.round(subtotal * IVA_RATE);
  const total      = subtotal + iva;

  // Summary panel
  safeSet('summary-plan-name', plan.nombre);
  safeSet('summary-base', `$${basePrice.toLocaleString()}`);
  safeSet('summary-iva',  `$${iva.toLocaleString()}`);
  safeSet('summary-total',`$${total.toLocaleString()}`);

  // Extras line
  const extrasLine = document.getElementById('extras-line');
  if (extrasLine) {
    extrasLine.style.display = extraGuests > 0 ? 'flex' : 'none';
  }
  safeSet('summary-extra-qty',  extraGuests);
  safeSet('summary-extra-cost', `$${extraCost.toLocaleString()}`);

  // Features list
  const featEl = document.getElementById('summary-features');
  if (featEl) {
    featEl.innerHTML = plan.caracteristicas.slice(0, 5).map(f => `
      <div class="order-feature">${f}</div>
    `).join('');
  }

  // Pay button text
  const payText = document.getElementById('pay-btn-text');
  if (payText) {
    const methodLabel = {
      stripe:       'Pagar',
      mercadopago:  'Continuar a MercadoPago',
      oxxo:         'Generar voucher OXXO',
    }[paymentMethod] || 'Pagar';
    payText.textContent = `${methodLabel} $${total.toLocaleString()} MXN`;
  }

  window._checkoutTotal  = total;
  window._checkoutPlanId = selectedPlanId;
}

/* ── PAYMENT METHOD SWITCH ───────────────── */
window.switchPayment = (method, btn) => {
  paymentMethod = method;

  // Update tabs
  document.querySelectorAll('.payment-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Update panels
  document.querySelectorAll('.payment-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`panel-${method}`);
  if (panel) panel.classList.add('active');

  updateSummary();
};

/* ── MP SUB METHOD ───────────────────────── */
window.selectMPMethod = (method, el) => {
  mpSubMethod = method;
  document.querySelectorAll('.mp-method').forEach(m => {
    m.style.borderColor = '';
    m.style.color = '';
  });
  if (el) {
    el.style.borderColor = 'var(--dorado)';
    el.style.color = 'var(--dorado)';
  }
  const msg = document.getElementById('mp-redirect-msg');
  if (msg) msg.style.display = 'block';
};

/* ── CARD FORMATTERS ─────────────────────── */
window.formatCardNumber = (input) => {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  val = val.replace(/(.{4})/g, '$1 ').trim();
  input.value = val;
};

window.formatExpiry = (input) => {
  let val = input.value.replace(/\D/g, '').substring(0, 4);
  if (val.length >= 2) val = val.substring(0,2) + ' / ' + val.substring(2);
  input.value = val;
};

/* ── PROCESS PAYMENT ─────────────────────── */
window.processPayment = async () => {
  const btn = document.getElementById('pay-btn');
  const plan = PLANS[selectedPlanId];
  if (!plan) return;

  // Validate based on method
  if (paymentMethod === 'stripe') {
    const name   = document.getElementById('card-name')?.value?.trim();
    const number = document.getElementById('card-number-sim')?.value?.replace(/\s/g,'');
    const expiry = document.getElementById('card-expiry')?.value?.trim();
    const cvc    = document.getElementById('card-cvc')?.value?.trim();

    if (!name) {
      Toast.error('Ingresa el nombre en la tarjeta');
      document.getElementById('card-name')?.focus();
      return;
    }
    if (!number || number.length < 16) {
      Toast.error('Número de tarjeta inválido');
      return;
    }
    if (!expiry || expiry.length < 7) {
      Toast.error('Fecha de vencimiento inválida');
      return;
    }
    if (!cvc || cvc.length < 3) {
      Toast.error('CVC inválido');
      return;
    }

    // Simulate Stripe payment
    Form.setLoading(btn, true, 'Procesando pago...');
    await simulateStripePayment(plan);

  } else if (paymentMethod === 'mercadopago') {
    if (!mpSubMethod) {
      Toast.error('Selecciona un método de pago de MercadoPago');
      return;
    }
    Form.setLoading(btn, true, 'Redirigiendo a MercadoPago...');
    await simulateMercadoPago(plan);

  } else if (paymentMethod === 'oxxo') {
    const email = document.getElementById('oxxo-email')?.value?.trim();
    if (!Validate.email(email || '')) {
      Toast.error('Ingresa tu correo para recibir el voucher');
      document.getElementById('oxxo-email')?.focus();
      return;
    }
    Form.setLoading(btn, true, 'Generando voucher OXXO...');
    await simulateOXXO(plan, email);
  }
};

/* ── STRIPE SIMULATION ───────────────────── */
async function simulateStripePayment(plan) {
  /**
   * PRODUCCIÓN: Aquí va la integración real con Stripe:
   *
   * 1. Tu backend crea un PaymentIntent:
   *    POST /api/create-payment-intent { amount, currency, metadata }
   *    → retorna { clientSecret }
   *
   * 2. Frontend confirma con Stripe Elements:
   *    const result = await stripe.confirmCardPayment(clientSecret, {
   *      payment_method: { card: cardElement, billing_details: { name } }
   *    });
   *
   * 3. Webhook /api/webhook maneja stripe.webhook.construct para
   *    confirmar el pago y actualizar el plan del usuario.
   *
   * ENDPOINTS NECESARIOS:
   *   POST /api/create-payment-intent
   *   POST /api/webhook  (Stripe webhook)
   *   POST /api/activate-plan
   */

  // Simulación frontend (demo)
  await delay(2500);

  // Simulate error for test card (for demo purposes)
  const cardNumber = document.getElementById('card-number-sim')?.value?.replace(/\s/g,'');
  if (cardNumber === '4000000000000002') {
    Form.setLoading(document.getElementById('pay-btn'), false);
    Toast.error('Tarjeta declinada. Intenta con otra tarjeta.');
    return;
  }

  await completeOrder(plan, 'stripe', cardNumber ? `**** **** **** ${cardNumber.slice(-4)}` : '');
}

/* ── MERCADOPAGO SIMULATION ──────────────── */
async function simulateMercadoPago(plan) {
  /**
   * PRODUCCIÓN: Integración MercadoPago Checkout Pro:
   *
   * 1. Backend crea preferencia:
   *    POST /api/create-preference { items, payer, back_urls }
   *    → retorna { id, init_point }
   *
   * 2. Frontend redirige:
   *    window.location.href = data.init_point;
   *
   * 3. MercadoPago redirige de vuelta a back_urls.success
   *
   * WEBHOOKS:
   *   POST /api/mp-webhook  (MercadoPago IPN)
   */

  await delay(1500);
  // En demo: simula redirect exitoso
  Toast.info('Redirigiendo a MercadoPago...');
  await delay(1000);
  await completeOrder(plan, 'mercadopago', mpSubMethod);
}

/* ── OXXO SIMULATION ─────────────────────── */
async function simulateOXXO(plan, email) {
  /**
   * PRODUCCIÓN:
   * 1. Backend crea PaymentIntent con payment_method_types: ['oxxo']
   * 2. Frontend muestra el voucher (hosted_voucher_url o display_details)
   * 3. Stripe webhook confirma cuando se paga en tienda
   */

  await delay(2000);
  await completeOrder(plan, 'oxxo', email, true); // true = pending
}

/* ── COMPLETE ORDER ──────────────────────── */
async function completeOrder(plan, method, detail, pending = false) {
  const btn   = document.getElementById('pay-btn');
  const total = window._checkoutTotal || plan.precio;

  try {
    // Create order record
    const order = await InvitArteDB.orders.create(currentUser.id, {
      planId:        plan.id,
      planNombre:    plan.nombre,
      total,
      extraGuests,
      method,
      detail,
      status:        pending ? 'pending' : 'completed',
    });

    // Update user plan (if paid)
    if (!pending) {
      await InvitArteDB.users.update(currentUser.id, { plan: plan.id });
    }

    // Show success screen
    showSuccessScreen(plan, order, method, detail, total, pending);

  } catch (err) {
    Form.setLoading(btn, false);
    Toast.error('Error al procesar el pago');
    console.error(err);
  }
}

/* ── SHOW SUCCESS SCREEN ─────────────────── */
function showSuccessScreen(plan, order, method, detail, total, pending) {
  document.getElementById('checkout-main').style.display = 'none';
  const screen = document.getElementById('success-screen');
  screen.style.display = 'block';
  screen.scrollIntoView({ behavior: 'smooth' });

  const receipt = document.getElementById('receipt-card');
  const methodLabels = {
    stripe:       '💳 Tarjeta de crédito/débito',
    mercadopago:  '🏦 MercadoPago',
    oxxo:         '🏪 OXXO Pay',
  };
  const statusHtml = pending
    ? '<span class="badge badge--gray">⏳ Pendiente de pago</span>'
    : '<span class="badge badge--green">✓ Pago confirmado</span>';

  if (receipt) {
    receipt.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-lg)">
        <div style="font-family:var(--font-display);font-size:1.2rem;color:var(--blanco)">
          Plan ${plan.nombre}
        </div>
        ${statusHtml}
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--sp-sm)">
        <div style="display:flex;justify-content:space-between;font-size:0.82rem">
          <span style="color:var(--gris-texto)">Orden #</span>
          <span style="color:var(--blanco)">${order.id.toUpperCase()}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.82rem">
          <span style="color:var(--gris-texto)">Método de pago</span>
          <span style="color:var(--blanco)">${methodLabels[method] || method}</span>
        </div>
        ${detail ? `
        <div style="display:flex;justify-content:space-between;font-size:0.82rem">
          <span style="color:var(--gris-texto)">Detalle</span>
          <span style="color:var(--blanco)">${detail}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:0.82rem">
          <span style="color:var(--gris-texto)">Invitados incluidos</span>
          <span style="color:var(--blanco)">${plan.invitadosIncluidos + extraGuests}</span>
        </div>
        <div style="
          display:flex;justify-content:space-between;
          font-size:1rem;font-weight:600;
          margin-top:var(--sp-md);
          padding-top:var(--sp-md);
          border-top:1px solid var(--dorado-borde);
        ">
          <span style="color:var(--dorado)">Total pagado</span>
          <span style="color:var(--dorado);font-family:var(--font-display);font-size:1.5rem">
            $${total.toLocaleString()} MXN
          </span>
        </div>
      </div>

      ${pending ? `
      <div style="margin-top:var(--sp-lg);padding:var(--sp-md);background:rgba(201,168,76,0.06);border-radius:var(--r-md);font-size:0.78rem;color:var(--gris-texto);line-height:1.6">
        📧 Se envió el voucher a tu correo. Tienes 48 horas para pagar en OXXO. 
        Tu plan se activará automáticamente al confirmar el pago.
      </div>` : ''}
    `;
  }
}

/* ── HELPERS ─────────────────────────────── */
const safeSet = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));
