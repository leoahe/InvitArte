/**
 * INVITARTE — HOME.JS
 * Lógica completa de la home page:
 * - Partículas canvas hero
 * - Reveal on scroll (IntersectionObserver)
 * - Navbar scroll effect
 * - Mobile menu
 * - Modal contacto con validación
 * - Formulario de contacto con estado éxito
 */

document.addEventListener('DOMContentLoaded', () => {

  initParticles();
  initScrollEffects();
  initNavbar();
  initContactForm();

});

/* ══════════════════════════════════════════
   PARTÍCULAS CANVAS HERO
══════════════════════════════════════════ */
function initParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let raf;
  let W, H;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  function createParticle() {
    return {
      x:      Math.random() * W,
      y:      Math.random() * H,
      size:   Math.random() * 2 + 0.3,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: -(Math.random() * 0.4 + 0.1),
      opacity: Math.random() * 0.5 + 0.1,
      life:   1,
      decay:  Math.random() * 0.002 + 0.0005,
    };
  }

  // Init pool
  for (let i = 0; i < 60; i++) particles.push(createParticle());

  function draw() {
    ctx.clearRect(0, 0, W, H);

    particles.forEach((p, i) => {
      p.x    += p.speedX;
      p.y    += p.speedY;
      p.life -= p.decay;

      if (p.life <= 0 || p.y < -10 || p.x < -10 || p.x > W + 10) {
        particles[i] = createParticle();
        particles[i].y = H + 5;
        return;
      }

      ctx.save();
      ctx.globalAlpha = p.opacity * p.life;
      ctx.fillStyle   = '#c9a84c';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    raf = requestAnimationFrame(draw);
  }

  draw();

  // Detener cuando no está visible (performance)
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        if (!raf) draw();
      } else {
        cancelAnimationFrame(raf);
        raf = null;
      }
    });
    obs.observe(heroSection);
  }
}

/* ══════════════════════════════════════════
   REVEAL ON SCROLL
══════════════════════════════════════════ */
function initScrollEffects() {
  // Todos los elementos con reveal
  const targets = document.querySelectorAll(
    '.reveal-up, .reveal-phone, .benefit-card, .cta-section'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Pequeño delay para benefit cards con animation-delay en style
        const delay = entry.target.style.animationDelay
          ? parseFloat(entry.target.style.animationDelay) * 1000
          : 0;

        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);

        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(el => observer.observe(el));

  // Phones — trigger inmediatamente si ya están en viewport
  setTimeout(() => {
    document.querySelectorAll('.reveal-phone').forEach(el => {
      el.classList.add('visible');
    });
  }, 400);
}

/* ══════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════ */
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

/* ══════════════════════════════════════════
   MOBILE MENU
══════════════════════════════════════════ */
window.toggleMobileMenu = () => {
  const menu   = document.getElementById('mobile-menu');
  const burger = document.getElementById('burger');
  if (!menu) return;
  const isOpen = menu.classList.toggle('open');
  if (burger) {
    const spans = burger.querySelectorAll('span');
    if (isOpen) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity   = '';
      spans[2].style.transform = '';
    }
  }
};

// Cerrar menu al hacer scroll
window.addEventListener('scroll', () => {
  const menu = document.getElementById('mobile-menu');
  if (menu && menu.classList.contains('open')) {
    menu.classList.remove('open');
  }
}, { passive: true });

/* ══════════════════════════════════════════
   MODAL CONTACTO
══════════════════════════════════════════ */
window.abrirContacto = () => {
  const modal = document.getElementById('modal-contacto');
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Reset form
  resetContactForm();
};

window.cerrarContacto = () => {
  const modal = document.getElementById('modal-contacto');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
};

// Cerrar al hacer clic fuera
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-contacto');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cerrarContacto();
    });
  }
});

// Cerrar con ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarContacto();
});

function resetContactForm() {
  const form    = document.getElementById('contact-form');
  const success = document.getElementById('contact-success');
  const submit  = document.getElementById('cf-submit');

  if (form) {
    form.querySelectorAll('.form-input').forEach(input => {
      input.value = '';
      input.classList.remove('error', 'success');
    });
    form.querySelectorAll('.form-error').forEach(el => {
      el.classList.remove('visible');
    });
  }

  if (success) success.style.display = 'none';
  if (submit)  {
    submit.style.display = '';
    submit.disabled = false;
    submit.textContent = 'Enviar mensaje';
  }
}

/* ══════════════════════════════════════════
   FORMULARIO DE CONTACTO
══════════════════════════════════════════ */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre  = document.getElementById('cf-nombre');
    const email   = document.getElementById('cf-email');
    const mensaje = document.getElementById('cf-mensaje');
    const submit  = document.getElementById('cf-submit');
    const success = document.getElementById('contact-success');

    // Reset errors
    [nombre, email, mensaje].forEach(el => {
      el.classList.remove('error');
      const errEl = el.closest('.form-group')?.querySelector('.form-error');
      if (errEl) errEl.classList.remove('visible');
    });

    // Validaciones
    let hasError = false;

    if (!nombre.value.trim() || nombre.value.trim().length < 2) {
      showFieldError(nombre, 'Ingresa tu nombre completo');
      hasError = true;
    }

    if (!isValidEmail(email.value.trim())) {
      showFieldError(email, 'Ingresa un correo válido');
      hasError = true;
    }

    if (!mensaje.value.trim() || mensaje.value.trim().length < 10) {
      showFieldError(mensaje, 'El mensaje debe tener al menos 10 caracteres');
      hasError = true;
    }

    if (hasError) return;

    // Loading state
    submit.disabled = true;
    submit.textContent = 'Enviando...';
    submit.classList.add('btn--loading');

    // Simular envío (en producción: fetch a tu endpoint o EmailJS)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Éxito
    submit.style.display   = 'none';
    success.style.display  = 'block';

    // En producción puedes enviar a EmailJS así:
    // await emailjs.send('service_id', 'template_id', {
    //   from_name:  nombre.value,
    //   from_email: email.value,
    //   message:    mensaje.value,
    // });

    // Log para desarrollo
    console.log('Mensaje de contacto:', {
      nombre:  nombre.value.trim(),
      email:   email.value.trim(),
      mensaje: mensaje.value.trim(),
    });
  });
}

function showFieldError(inputEl, message) {
  inputEl.classList.add('error');
  const group = inputEl.closest('.form-group');
  if (!group) return;
  let errEl = group.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'form-error';
    group.appendChild(errEl);
  }
  errEl.textContent = '✗ ' + message;
  errEl.classList.add('visible');
}

function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}
