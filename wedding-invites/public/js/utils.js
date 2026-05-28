/**
 * INVITARTE — UTILS.JS
 * Helpers compartidos en toda la app.
 */

/* ── TOAST SYSTEM ────────────────────────── */
const Toast = (() => {
  let container = null;

  const init = () => {
    if (container) return;
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  };

  const show = (message, type = 'info', duration = 4000) => {
    init();
    const icons = { success: '✓', error: '✗', info: '◈' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || icons.info}</span>
      <span class="toast__msg">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration + 400);
  };

  return {
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error'),
    info:    (msg) => show(msg, 'info'),
  };
})();

/* ── PAGE LOADER ─────────────────────────── */
const Loader = {
  show() {
    let loader = document.getElementById('page-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'page-loader';
      loader.innerHTML = `
        <div class="loader-logo">InvitArte</div>
        <div class="loader-bar"></div>
      `;
      document.body.appendChild(loader);
    }
    loader.classList.remove('hidden');
  },
  hide() {
    const loader = document.getElementById('page-loader');
    if (loader) loader.classList.add('hidden');
  }
};

/* ── VALIDATIONS ─────────────────────────── */
const Validate = {
  email(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  },

  phone(val) {
    return /^[\d\s\-\+\(\)]{8,15}$/.test(val.trim());
  },

  password(val) {
    const checks = {
      length:  val.length >= 8,
      upper:   /[A-Z]/.test(val),
      lower:   /[a-z]/.test(val),
      number:  /\d/.test(val),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(val),
    };
    const strength = Object.values(checks).filter(Boolean).length;
    return { ...checks, strength, valid: strength >= 4 };
  },

  required(val) {
    return val !== null && val !== undefined && val.toString().trim().length > 0;
  },
};

/* ── FORM HELPERS ────────────────────────── */
const Form = {
  showError(fieldEl, message) {
    const wrapper = fieldEl.closest('.form-group');
    if (!wrapper) return;
    fieldEl.classList.add('error');
    fieldEl.classList.remove('success');
    let errEl = wrapper.querySelector('.form-error');
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.className = 'form-error';
      wrapper.appendChild(errEl);
    }
    errEl.innerHTML = `✗ ${message}`;
    errEl.classList.add('visible');
  },

  clearError(fieldEl) {
    const wrapper = fieldEl.closest('.form-group');
    if (!wrapper) return;
    fieldEl.classList.remove('error');
    fieldEl.classList.add('success');
    const errEl = wrapper.querySelector('.form-error');
    if (errEl) errEl.classList.remove('visible');
  },

  clearAll(formEl) {
    formEl.querySelectorAll('.form-input').forEach(input => {
      input.classList.remove('error', 'success');
    });
    formEl.querySelectorAll('.form-error').forEach(el => {
      el.classList.remove('visible');
    });
  },

  setLoading(btn, loading, text = '') {
    if (loading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = text || btn.innerHTML;
      btn.classList.add('btn--loading');
      btn.disabled = true;
    } else {
      if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
      btn.classList.remove('btn--loading');
      btn.disabled = false;
    }
  },

  passwordStrengthBar(inputEl, barContainerId) {
    const container = document.getElementById(barContainerId);
    if (!container) return;
    const result = Validate.password(inputEl.value);
    const labels = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Excelente'];
    const colors = ['#e05555', '#e07a55', '#e0c455', '#5ec47a', '#4caf9a'];
    const s = result.strength;
    container.innerHTML = `
      <div style="display:flex;gap:4px;margin-top:6px">
        ${[1,2,3,4,5].map(i => `
          <div style="flex:1;height:3px;border-radius:99px;background:${i<=s ? colors[s-1] : 'rgba(255,255,255,0.1)'}"></div>
        `).join('')}
      </div>
      <div style="font-size:0.7rem;margin-top:4px;color:${colors[s-1] || 'var(--gris-texto)'}">
        ${labels[s-1] || ''}
      </div>
    `;
  }
};

/* ── MODAL SYSTEM ────────────────────────── */
const Modal = {
  open(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  },
  close(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  },
  init() {
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const overlay = btn.closest('.modal-overlay');
        if (overlay) this.close(overlay.id);
      });
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) this.close(overlay.id);
      });
    });
  }
};

/* ── AUTH GUARD ──────────────────────────── */
const Auth = {
  async requireLogin(redirectTo = '/login.html') {
    const user = await InvitArteDB.users.getCurrentUser();
    if (!user) {
      window.location.href = redirectTo;
      return null;
    }
    return user;
  },

  async redirectIfLoggedIn(to = '/dashboard.html') {
    const user = await InvitArteDB.users.getCurrentUser();
    if (user) window.location.href = to;
  },

  async logout() {
    await InvitArteDB.users.logout();
    window.location.href = '/login.html';
  }
};

/* ── NAVBAR INIT ─────────────────────────── */
const Navbar = {
  async init() {
    const user = await InvitArteDB.users.getCurrentUser();

    // Highlight active link
    const links = document.querySelectorAll('.navbar__link');
    const path = window.location.pathname.split('/').pop();
    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.includes(path) && path !== '') link.classList.add('active');
    });

    // Scroll effect
    const nav = document.querySelector('.navbar');
    if (nav) {
      window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 50);
      }, { passive: true });
    }

    // Burger menu
    const burger = document.querySelector('.navbar__burger');
    const mobileNav = document.querySelector('.navbar__mobile');
    if (burger && mobileNav) {
      burger.addEventListener('click', () => {
        mobileNav.classList.toggle('open');
      });
    }

    // Update nav CTAs based on auth
    const ctaArea = document.querySelector('.navbar__actions');
    if (ctaArea && user) {
      ctaArea.innerHTML = `
        <span style="color:var(--gris-texto);font-size:0.75rem">Hola, ${user.nombre.split(' ')[0]}</span>
        <a href="/dashboard.html" class="btn btn--primary btn--sm">Dashboard</a>
      `;
    }
  }
};

/* ── PARTICLES ───────────────────────────── */
const Particles = {
  init(canvasId = 'particles-canvas', count = 50) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let raf;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const createParticle = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -Math.random() * 0.6 - 0.2,
      opacity: Math.random() * 0.6 + 0.1,
      life: 1,
      decay: Math.random() * 0.003 + 0.001,
    });

    for (let i = 0; i < count; i++) particles.push(createParticle());

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.life -= p.decay;
        if (p.life <= 0 || p.y < -10) particles[i] = createParticle();

        ctx.save();
        ctx.globalAlpha = p.opacity * p.life;
        ctx.fillStyle = '#c9a84c';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }
};

/* ── QR GENERATOR ────────────────────────── */
const QRGen = {
  generate(text, size = 200) {
    // Uses Google Charts API (no external lib needed)
    const encoded = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&color=c9a84c&bgcolor=111111&format=png&qzone=1`;
  },

  async downloadQR(text, filename = 'qr-invitacion') {
    const url = this.generate(text, 400);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.png';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
};

/* ── SHARE HELPERS ───────────────────────── */
const Share = {
  whatsapp(url, name) {
    const msg = `Te invito a ver mi invitación digital 🎊\n${name ? `*${name}*\n` : ''}${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  },

  copyLink(url) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        Toast.success('Enlace copiado al portapapeles');
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      Toast.success('Enlace copiado');
    }
  }
};

/* ── CSV / EXCEL PARSER ──────────────────── */
const FileParser = {
  parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
    return lines.slice(1)
      .filter(l => l.trim())
      .map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => obj[h] = vals[i] || '');

        // Normalize headers
        const nombre = obj.nombre || obj.name || obj.invitado || '';
        const pases  = parseInt(obj.pases || obj.passes || obj.acompañantes || 1) || 1;
        const mesa   = obj.mesa || obj.table || '';
        if (!nombre) return null;
        return { nombre, pases, mesa };
      })
      .filter(Boolean);
  },

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  }
};

/* ── DATE HELPERS ────────────────────────── */
const DateUtils = {
  formatDate(dateStr) {
    if (!dateStr) return '';
    const months = ['enero','febrero','marzo','abril','mayo','junio',
                    'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const d = new Date(dateStr + 'T12:00:00');
    return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  },

  countdown(targetDateStr) {
    const target = new Date(targetDateStr + 'T12:00:00').getTime();
    const now    = Date.now();
    const diff   = target - now;
    if (diff <= 0) return { days:0, hours:0, minutes:0, seconds:0, past:true };
    return {
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000)  / 60000),
      seconds: Math.floor((diff % 60000)    / 1000),
      past: false,
    };
  }
};

/* ── PLANS CONFIG ────────────────────────── */
const PLANS = {
  basico: {
    id: 'basico',
    nombre: 'Básico',
    precio: 499,
    invitadosIncluidos: 50,
    extraPorInvitado: 5,
    caracteristicas: [
      '1 invitación digital',
      'Hasta 50 invitados incluidos',
      'Cuenta regresiva',
      'Google Maps',
      'Soporte básico',
    ],
    noIncluye: [
      'Múltiples plantillas',
      'Generación de QR',
      'Exportar PDF',
      'Música personalizada',
    ],
  },
  premium: {
    id: 'premium',
    nombre: 'Premium',
    precio: 999,
    invitadosIncluidos: 150,
    extraPorInvitado: 4,
    destacado: true,
    caracteristicas: [
      '1 invitación digital premium',
      'Hasta 150 invitados incluidos',
      'Todas las plantillas',
      'Generación de QR por invitado',
      'Exportar lista de invitados',
      'Música personalizada',
      'Sección de padres y padrinos',
      'Galería de fotos',
      'Soporte prioritario',
    ],
    noIncluye: [
      'Exportar PDF personalizado',
    ],
  },
  ultra: {
    id: 'ultra',
    nombre: 'Ultra Premium',
    precio: 1799,
    invitadosIncluidos: 500,
    extraPorInvitado: 3,
    caracteristicas: [
      '1 invitación digital exclusiva',
      'Hasta 500 invitados incluidos',
      'Todas las plantillas + exclusivas',
      'QR personalizado por invitado',
      'Exportar PDF premium',
      'Exportar ZIP completo',
      'Diseño completamente personalizado',
      'Animaciones premium',
      'Soporte VIP 24/7',
      'Dominio personalizado',
    ],
    noIncluye: [],
  }
};

const calculateTotal = (planId, extraGuests = 0) => {
  const plan = PLANS[planId];
  if (!plan) return 0;
  return plan.precio + (Math.max(0, extraGuests) * plan.extraPorInvitado);
};

/* ── TEMPLATE DEFINITIONS ────────────────── */
const TEMPLATES = [
  { id: 'clasico',    nombre: 'Clásico Atemporal',  preview: '../images/template-clasico.jpg' },
  { id: 'romantico',  nombre: 'Romántico Floral',    preview: '../images/template-romantico.jpg' },
  { id: 'moderno',    nombre: 'Moderno Minimalista', preview: '../images/template-moderno.jpg' },
  { id: 'celestial',  nombre: 'Celestial Negro',     preview: '../images/template-celestial.jpg' },
  { id: 'jardin',     nombre: 'Jardín Francés',      preview: '../images/template-jardin.jpg' },
  { id: 'industrial', nombre: 'Industrial Chic',     preview: '../images/template-industrial.jpg' },
];

/* ── EXPOSE GLOBALS ──────────────────────── */
window.Toast      = Toast;
window.Loader     = Loader;
window.Validate   = Validate;
window.Form       = Form;
window.Modal      = Modal;
window.Auth       = Auth;
window.Navbar     = Navbar;
window.Particles  = Particles;
window.QRGen      = QRGen;
window.Share      = Share;
window.FileParser = FileParser;
window.DateUtils  = DateUtils;
window.PLANS      = PLANS;
window.TEMPLATES  = TEMPLATES;
window.calculateTotal = calculateTotal;
