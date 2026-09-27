/**
 * INVITARTE — AUTH.JS
 * Lógica de autenticación: registro, login, recuperación de contraseña.
 * Funciona en registro.html, login.html y recuperar.html
 */

document.addEventListener('DOMContentLoaded', async () => {

  // Init utilities
  Loader.show();
  Particles.init();

  // If already logged in, skip auth pages
  const currentPath = window.location.pathname.split('/').pop();
  const authPages = ['registro.html', 'login.html', 'recuperar.html', ''];
  if (authPages.includes(currentPath)) {
    await Auth.redirectIfLoggedIn('/dashboard.html');
  }

  // Hide loader
  setTimeout(() => Loader.hide(), 600);

  // ── DETERMINE CURRENT PAGE ───────────────────
  const page = currentPath;

  if (page === 'registro.html' || page === '') initRegistro();
  if (page === 'login.html')      initLogin();
  if (page === 'recuperar.html')  initRecuperar();

});

/* ══════════════════════════════════════════
   REGISTRO
══════════════════════════════════════════ */
function initRegistro() {
  const form      = document.getElementById('registro-form');
  const submitBtn = document.getElementById('submit-btn');
  const successEl = document.getElementById('success-state');
  if (!form) return;

  // Toggle password visibility
  setupTogglePassword('password', 'toggle-password');
  setupTogglePassword('confirm-password', 'toggle-confirm');

  // Real-time password strength
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      Form.passwordStrengthBar(passwordInput, 'password-strength');
    });
  }

  // Real-time email validation
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.addEventListener('blur', () => {
      if (emailInput.value) {
        if (Validate.email(emailInput.value)) {
          Form.clearError(emailInput);
          document.getElementById('email-icon').textContent = '✓';
        } else {
          Form.showError(emailInput, 'Ingresa un correo válido');
        }
      }
    });
  }

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Form.clearAll(form);

    const nombre    = document.getElementById('nombre').value.trim();
    const apellido  = document.getElementById('apellido').value.trim();
    const email     = document.getElementById('email').value.trim();
    const telefono  = document.getElementById('telefono').value.trim();
    const password  = document.getElementById('password').value;
    const confirm   = document.getElementById('confirm-password').value;

    // Validations
    let hasError = false;

    if (!Validate.required(nombre)) {
      Form.showError(document.getElementById('nombre'), 'Ingresa tu nombre');
      hasError = true;
    }

    if (!Validate.required(apellido)) {
      Form.showError(document.getElementById('apellido'), 'Ingresa tu apellido');
      hasError = true;
    }

    if (!Validate.email(email)) {
      Form.showError(document.getElementById('email'), 'Correo electrónico inválido');
      hasError = true;
    }

    if (telefono && !Validate.phone(telefono)) {
      Form.showError(document.getElementById('telefono'), 'Número de teléfono inválido');
      hasError = true;
    }

    const passResult = Validate.password(password);
    if (!passResult.valid) {
      Form.showError(document.getElementById('password'), 'La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas y números');
      hasError = true;
    }

    if (password !== confirm) {
      Form.showError(document.getElementById('confirm-password'), 'Las contraseñas no coinciden');
      hasError = true;
    }

    if (hasError) return;

    // Submit
    Form.setLoading(submitBtn, true, 'Creando cuenta...');

    try {
      await InvitArteDB.users.create({
        nombre: `${nombre} ${apellido}`,
        email,
        telefono,
        password,
      });

      // Auto-login
      await InvitArteDB.users.login(email, password);

      // Show success
      form.style.display = 'none';
      successEl.style.display = 'block';

      // Redirect after delay
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);

    } catch (err) {
      Toast.error(err.message || 'Error al crear la cuenta');
      Form.setLoading(submitBtn, false);

      if (err.message && err.message.includes('correo')) {
        Form.showError(document.getElementById('email'), err.message);
      }
    }
  });
}

/* ══════════════════════════════════════════
   LOGIN
══════════════════════════════════════════ */
function initLogin() {
  const form      = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  setupTogglePassword('password', 'toggle-password');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Form.clearAll(form);

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember')?.checked;

    let hasError = false;

    if (!Validate.email(email)) {
      Form.showError(document.getElementById('email'), 'Correo electrónico inválido');
      hasError = true;
    }

    if (!Validate.required(password)) {
      Form.showError(document.getElementById('password'), 'Ingresa tu contraseña');
      hasError = true;
    }

    if (hasError) return;

    Form.setLoading(submitBtn, true, 'Verificando...');

    try {
      const user = await InvitArteDB.users.login(email, password);

      if (remember) {
        localStorage.setItem('ia_remember', user.email);
      }

      Toast.success(`¡Bienvenida, ${user.nombre.split(' ')[0]}!`);

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);

    } catch (err) {
      Form.setLoading(submitBtn, false);
      Toast.error(err.message || 'Error al iniciar sesión');

      // Shake animation on error
      form.style.animation = 'none';
      form.offsetHeight; // reflow
      form.style.animation = 'shakeError 0.4s ease';
    }
  });

  // Pre-fill remembered email
  const remembered = localStorage.getItem('ia_remember');
  if (remembered) {
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.value = remembered;
      document.getElementById('remember').checked = true;
    }
  }

  // Add shake keyframes dynamically
  if (!document.getElementById('shake-style')) {
    const style = document.createElement('style');
    style.id = 'shake-style';
    style.textContent = `
      @keyframes shakeError {
        0%,100% { transform: translateX(0); }
        20%      { transform: translateX(-8px); }
        40%      { transform: translateX(8px); }
        60%      { transform: translateX(-5px); }
        80%      { transform: translateX(5px); }
      }
    `;
    document.head.appendChild(style);
  }
}

/* ══════════════════════════════════════════
   RECUPERAR CONTRASEÑA
══════════════════════════════════════════ */
function initRecuperar() {
  const form      = document.getElementById('recovery-form');
  const submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  window.showStep = (n) => {
    document.querySelectorAll('.recovery-step').forEach(s => s.classList.remove('active'));
    const step = document.getElementById(`step-${n}`);
    if (step) step.classList.add('active');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Form.clearAll(form);

    const email = document.getElementById('email').value.trim();

    if (!Validate.email(email)) {
      Form.showError(document.getElementById('email'), 'Ingresa un correo válido');
      return;
    }

    Form.setLoading(submitBtn, true, 'Enviando...');

    try {
      const token = await InvitArteDB.users.resetPasswordRequest(email);
      document.getElementById('sent-email').textContent = email;

      // Store token for demo
      window._resetToken = token;
      window._resetEmail = email;

      showStep(2);
      Form.setLoading(submitBtn, false);

    } catch (err) {
      Form.setLoading(submitBtn, false);
      Toast.error(err.message || 'Error al enviar instrucciones');
      Form.showError(document.getElementById('email'), err.message);
    }
  });

  // New password form (demo)
  const newPassForm = document.getElementById('new-password-form');
  if (newPassForm) {
    setupTogglePassword('new-password', 'toggle-new');

    const npInput = document.getElementById('new-password');
    if (npInput) {
      npInput.addEventListener('input', () => {
        Form.passwordStrengthBar(npInput, 'new-strength');
      });
    }

    newPassForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      Form.clearAll(newPassForm);

      const newPass    = document.getElementById('new-password').value;
      const confirmNew = document.getElementById('confirm-new-password').value;
      const btn        = document.getElementById('new-pass-btn');

      let hasError = false;

      const result = Validate.password(newPass);
      if (!result.valid) {
        Form.showError(document.getElementById('new-password'), 'La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas y números');
        hasError = true;
      }

      if (newPass !== confirmNew) {
        Form.showError(document.getElementById('confirm-new-password'), 'Las contraseñas no coinciden');
        hasError = true;
      }

      if (hasError) return;

      Form.setLoading(btn, true, 'Actualizando...');

      try {
        await InvitArteDB.users.resetPassword(window._resetToken, newPass);
        showStep(3);
      } catch (err) {
        Form.setLoading(btn, false);
        Toast.error(err.message || 'Error al restablecer contraseña');
      }
    });
  }
}

/* ── HELPER: Toggle password visibility ──── */
function setupTogglePassword(inputId, toggleId) {
  const input  = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);
  if (!input || !toggle) return;

  toggle.addEventListener('click', () => {
    const isText = input.type === 'text';
    input.type   = isText ? 'password' : 'text';
    toggle.textContent = isText ? '👁' : '🙈';
  });
}
