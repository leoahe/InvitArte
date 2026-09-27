/**
 * INVITARTE — AUTH.JS definitivo
 * Registro, login y recuperación de contraseña.
 */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Ocultar loader SIEMPRE, inmediatamente ── */
  const hideLoader = () => {
    document.querySelectorAll('#page-loader,.ia-loader,[id$="-loader"]').forEach(el => {
      el.classList.add('hidden');
      el.style.cssText += ';opacity:0!important;pointer-events:none!important;display:none!important';
    });
  };
  hideLoader();
  setTimeout(hideLoader, 80);
  setTimeout(hideLoader, 400);

  try { Particles.init(); } catch {}

  const page = window.location.pathname.split('/').pop() || 'index.html';

  if (page === 'registro.html'  || page === '') initRegistro();
  if (page === 'login.html')                    initLogin();
  if (page === 'recuperar.html')                initRecuperar();

  /* Verificar sesión activa EN SEGUNDO PLANO (no bloquea la UI) */
  const authPages = ['registro.html','login.html','recuperar.html',''];
  if (authPages.includes(page)) {
    setTimeout(async () => {
      try {
        const user = await InvitArteDB.users.getCurrentUser();
        if (user) window.location.href = 'dashboard.html';
      } catch {}
    }, 300);
  }
});

/* ════════════════════════════════════════
   VALIDACIONES
════════════════════════════════════════ */
const V = {
  required: v => v && v.trim().length >= 1,
  email:    v => /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test((v||'').trim()),
  password: v => v && v.length >= 8,
  phone:    v => !v || v.trim() === '' || /^[\d\s\-\+\(\)]{7,15}$/.test(v.trim()),
};

/* ════════════════════════════════════════
   HELPERS UI
════════════════════════════════════════ */
function fieldErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = '#e53e3e';
  let e = el.parentElement.querySelector('.ia-ferr');
  if (!e) {
    e = document.createElement('span');
    e.className = 'ia-ferr';
    e.style.cssText = 'color:#e53e3e;font-size:.73rem;margin-top:3px;display:block';
    el.parentElement.appendChild(e);
  }
  e.textContent = msg;
  try { Form.showError(el, msg); } catch {}
}

function fieldOk(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = '';
  const e = el.parentElement.querySelector('.ia-ferr');
  if (e) e.textContent = '';
  try { Form.clearError(el); } catch {}
}

function clearForm(form) {
  form.querySelectorAll('input').forEach(el => { el.style.borderColor=''; });
  form.querySelectorAll('.ia-ferr').forEach(e => { e.textContent=''; });
  try { Form.clearAll(form); } catch {}
}

function toast(msg, type='error') {
  try {
    if (type === 'error') Toast.error(msg); else Toast.success(msg);
    return;
  } catch {}
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${type==='error'?'#e53e3e':'#38a169'};color:#fff;
    padding:12px 20px;border-radius:10px;font-size:.85rem;
    box-shadow:0 4px 20px rgba(0,0,0,.18);max-width:320px;font-family:inherit`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function btnLoad(btn, loading, text='Procesando...') {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn._orig = btn.textContent;
    btn.textContent = text;
    btn.style.opacity = '.75';
  } else {
    btn.disabled = false;
    btn.textContent = btn._orig || 'Enviar';
    btn.style.opacity = '1';
  }
  try { Form.setLoading(btn, loading, text); } catch {}
}

function setupEye(inputId, toggleId) {
  const inp = document.getElementById(inputId);
  const tog = document.getElementById(toggleId);
  if (!inp || !tog) return;
  tog.addEventListener('click', () => {
    inp.type = inp.type === 'password' ? 'text' : 'password';
    tog.textContent = inp.type === 'password' ? '👁' : '🙈';
  });
}

/* ════════════════════════════════════════
   REGISTRO
════════════════════════════════════════ */
function initRegistro() {
  const form      = document.getElementById('registro-form');
  const submitBtn = document.getElementById('submit-btn');
  const successEl = document.getElementById('success-state');
  if (!form) return;

  setupEye('password', 'toggle-password');
  setupEye('confirm-password', 'toggle-confirm');

  const passInp = document.getElementById('password');
  if (passInp) {
    passInp.addEventListener('input', () => {
      try { Form.passwordStrengthBar(passInp, 'password-strength'); } catch {}
    });
  }

  const emailInp = document.getElementById('email');
  if (emailInp) {
    emailInp.addEventListener('input', () => {
      if (V.email(emailInp.value)) fieldOk('email');
    });
    emailInp.addEventListener('blur', () => {
      if (!emailInp.value) return;
      if (!V.email(emailInp.value)) fieldErr('email', 'Correo electrónico inválido');
      else { fieldOk('email'); const ic=document.getElementById('email-icon'); if(ic) ic.textContent='✓'; }
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearForm(form);

    const nombre   = (document.getElementById('nombre')?.value   || '').trim();
    const apellido = (document.getElementById('apellido')?.value || '').trim();
    const email    = (document.getElementById('email')?.value    || '').trim();
    const telefono = (document.getElementById('telefono')?.value || '').trim();
    const password = document.getElementById('password')?.value  || '';
    const confirm  = document.getElementById('confirm-password')?.value || '';

    let ok = true;
    if (!V.required(nombre))   { fieldErr('nombre',           'Ingresa tu nombre');             ok=false; }
    if (!V.required(apellido)) { fieldErr('apellido',         'Ingresa tu apellido');           ok=false; }
    if (!V.email(email))       { fieldErr('email',            'Correo electrónico inválido');   ok=false; }
    if (!V.phone(telefono))    { fieldErr('telefono',         'Teléfono inválido');             ok=false; }
    if (!V.password(password)) { fieldErr('password',         'Mínimo 8 caracteres');          ok=false; }
    if (password !== confirm)  { fieldErr('confirm-password', 'Las contraseñas no coinciden'); ok=false; }
    if (!ok) return;

    btnLoad(submitBtn, true, 'Creando cuenta...');
    try {
      const user = await InvitArteDB.users.create({ nombre, apellido, email, telefono, password });
      btnLoad(submitBtn, false);
      if (form)      form.style.display      = 'none';
      if (successEl) successEl.style.display = 'block';
      toast(`¡Bienvenido, ${nombre}!`, 'success');
      setTimeout(() => {
        const plan = new URLSearchParams(window.location.search).get('plan') || '';
        window.location.href = plan ? `dashboard.html?plan=${plan}` : 'dashboard.html';
      }, 1800);
    } catch (err) {
      btnLoad(submitBtn, false);
      toast(err.message || 'Error al crear la cuenta', 'error');
      if (err.code === 'EMAIL_EXISTS') fieldErr('email', 'Este correo ya está registrado');
      if (err.errors) err.errors.forEach(e => fieldErr(e.field, e.message));
    }
  });
}

/* ════════════════════════════════════════
   LOGIN
════════════════════════════════════════ */
function initLogin() {
  const form      = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  setupEye('password', 'toggle-password');

  const remembered = localStorage.getItem('ia_remember');
  if (remembered) {
    const ei = document.getElementById('email');
    const ri = document.getElementById('remember');
    if (ei) ei.value = remembered;
    if (ri) ri.checked = true;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearForm(form);

    const email    = (document.getElementById('email')?.value    || '').trim();
    const password = document.getElementById('password')?.value  || '';
    const remember = document.getElementById('remember')?.checked;

    let ok = true;
    if (!V.email(email))       { fieldErr('email',    'Correo electrónico inválido'); ok=false; }
    if (!V.required(password)) { fieldErr('password', 'Ingresa tu contraseña');      ok=false; }
    if (!ok) return;

    btnLoad(submitBtn, true, 'Verificando...');
    try {
      const user = await InvitArteDB.users.login(email, password);
      if (remember) localStorage.setItem('ia_remember', email);
      else          localStorage.removeItem('ia_remember');
      const name = (user.nombre || 'Usuario').split(' ')[0];
      toast(`¡Bienvenido, ${name}!`, 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } catch (err) {
      btnLoad(submitBtn, false);
      toast(err.message || 'Correo o contraseña incorrectos', 'error');
    }
  });
}

/* ════════════════════════════════════════
   RECUPERAR CONTRASEÑA
════════════════════════════════════════ */
function initRecuperar() {
  const form      = document.getElementById('recovery-form');
  const submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  // showStep compatible con recuperar.html
  window.showStep = (n) => {
    document.querySelectorAll('.recovery-step').forEach(s => s.classList.remove('active'));
    const s = document.getElementById(`step-${n}`);
    if (s) s.classList.add('active');
  };

  /* Paso 1 — solicitar reset */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = (document.getElementById('email')?.value || '').trim();
    if (!V.email(email)) { fieldErr('email', 'Ingresa un correo válido'); return; }

    btnLoad(submitBtn, true, 'Enviando...');
    try {
      const data = await InvitArteDB.users.resetPasswordRequest(email);
      const sentEl = document.getElementById('sent-email');
      if (sentEl) sentEl.textContent = email;
      showStep(2);
    } catch (err) {
      toast(err.message || 'Error al enviar instrucciones', 'error');
    } finally {
      btnLoad(submitBtn, false);
    }
  });

  /* Paso 2 — nueva contraseña */
  const newPassForm = document.getElementById('new-password-form');
  if (newPassForm) {
    setupEye('new-password', 'toggle-new');
    const npInp = document.getElementById('new-password');
    if (npInp) npInp.addEventListener('input', () => {
      try { Form.passwordStrengthBar(npInp, 'new-strength'); } catch {}
    });

    newPassForm.addEventListener('submit', async e => {
      e.preventDefault();
      const newPass    = document.getElementById('new-password')?.value         || '';
      const confirmNew = document.getElementById('confirm-new-password')?.value || '';
      const btn        = document.getElementById('new-pass-btn');

      let ok = true;
      if (!V.password(newPass))    { fieldErr('new-password',         'Mínimo 8 caracteres');         ok=false; }
      if (newPass !== confirmNew)  { fieldErr('confirm-new-password', 'Las contraseñas no coinciden'); ok=false; }
      if (!ok) return;

      if (!window._resetToken) {
        toast('Token de recuperación no encontrado. Solicita el reset nuevamente.', 'error');
        return;
      }

      btnLoad(btn, true, 'Actualizando...');
      try {
        await InvitArteDB.users.resetPassword(window._resetToken, newPass);
        window._resetToken = null;
        showStep(3);
      } catch (err) {
        toast(err.message || 'Error al restablecer contraseña', 'error');
      } finally {
        btnLoad(btn, false);
      }
    });
  }
}
