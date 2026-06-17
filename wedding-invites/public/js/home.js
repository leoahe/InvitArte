/**
 * INVITARTE — HOME.JS
 * Partículas + Pétalos en iPhones + Navbar + Modal Contacto
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initHeroCanvas();
  initPreviewEffects();   // partículas/pétalos en los 3 iPhones
  initPhoneScroll();
  initScrollReveal();
  initContactModal();
  initContactForm();
  initCountdown();

  // Mostrar teléfonos con animación
  setTimeout(() => {
    document.querySelectorAll('.phone-wrapper').forEach(pw => pw.classList.add('visible'));
  }, 350);
});

/* ── NAVBAR ──────────────────────────────────────────────────── */
function initNavbar() {
  const nav    = document.getElementById('navbar');
  const burger = document.getElementById('burger');
  const menu   = document.getElementById('mobile-menu');

  if (nav) {
    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 50), { passive: true });
  }
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      const ss = burger.querySelectorAll('span');
      ss[0].style.transform = open ? 'rotate(45deg) translate(5px,5px)' : '';
      ss[1].style.opacity   = open ? '0' : '';
      ss[2].style.transform = open ? 'rotate(-45deg) translate(5px,-5px)' : '';
    });
  }
  window.addEventListener('scroll', () => menu?.classList.remove('open'), { passive: true });
  ['nav-contacto-btn','mob-contacto-btn','hero-contacto-btn','cta-contacto-btn','footer-contacto-btn'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', openContact));
}

/* ── CANVAS PARTÍCULAS HERO ──────────────────────────────────── */
function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, pts = [], raf;
  const resize = () => {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  function mkPt(x, y) {
    return { x, y, size: Math.random()*2+.3, speedX:(Math.random()-.5)*.25, speedY:-(Math.random()*.35+.08), opacity:Math.random()*.3+.05, life:1, decay:Math.random()*.0015+.0004 };
  }
  for (let i = 0; i < 50; i++) pts.push(mkPt(Math.random()*1200, Math.random()*800));
  const draw = () => {
    ctx.clearRect(0,0,W,H);
    pts.forEach((p,i) => {
      p.x+=p.speedX; p.y+=p.speedY; p.life-=p.decay;
      if (p.life<=0||p.y<-10) { pts[i]=mkPt(Math.random()*W, H+5); return; }
      ctx.save(); ctx.globalAlpha=p.opacity*p.life; ctx.fillStyle='#C9A876';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); ctx.restore();
    });
    raf = requestAnimationFrame(draw);
  };
  draw();
}

/* ══════════════════════════════════════════════════════════════
   EFECTOS EN PREVIEWS DE IPHONE
   Cada iPhone tiene un div .phone-preview con overflow:hidden
   Los efectos (partículas, pétalos) se crean como canvas/divs
   DENTRO del contenedor del preview para respetar el clip.
══════════════════════════════════════════════════════════════ */
function initPreviewEffects() {
  initParticlesElegante();
  initPetalosFloral();
  initPetalosBeige();
}

/* ── 1. PARTÍCULAS DORADAS — ELEGANTE ───────────────────────── */
function initParticlesElegante() {
  const wrap = document.getElementById('p1particles');
  if (!wrap) return;

  // Canvas dentro del preview para respetar el clip
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
  canvas.width  = 390;
  canvas.height = 900;
  wrap.parentElement.style.position = 'relative';
  wrap.parentElement.appendChild(canvas);
  // Ocultar el div placeholder
  wrap.style.display = 'none';

  const ctx = canvas.getContext('2d');
  const pts = [];
  for (let i = 0; i < 55; i++) pts.push(mkGoldPt());

  function mkGoldPt() {
    return {
      x:       Math.random() * 390,
      y:       Math.random() * 900,
      size:    Math.random() * 2.5 + .5,
      vy:      -(Math.random() * .8 + .2),
      vx:      (Math.random() - .5) * .3,
      opacity: Math.random() * .7 + .2,   // más visibles que antes
      life: 1,
      decay: Math.random() * .002 + .0005,
    };
  }

  (function draw() {
    ctx.clearRect(0, 0, 390, 900);
    pts.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0 || p.y < -10) { pts[i] = mkGoldPt(); pts[i].y = 910; return; }
      // Dibujar destello dorado: círculo + cruz de luz
      ctx.save();
      ctx.globalAlpha = p.opacity * p.life;
      // Partícula principal
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size*2);
      grad.addColorStop(0,   'rgba(255,240,160,1)');
      grad.addColorStop(0.4, 'rgba(201,168,76,.8)');
      grad.addColorStop(1,   'rgba(201,168,76,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
      // Cruz de brillo en partículas grandes
      if (p.size > 1.5) {
        ctx.strokeStyle = 'rgba(255,240,160,.6)';
        ctx.lineWidth   = .5;
        const s = p.size * 3;
        ctx.beginPath(); ctx.moveTo(p.x-s,p.y); ctx.lineTo(p.x+s,p.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x,p.y-s); ctx.lineTo(p.x,p.y+s); ctx.stroke();
      }
      ctx.restore();
    });
    requestAnimationFrame(draw);
  })();
}

/* ── 2. PÉTALOS ROSAS/LILA — FLORAL PASTEL ──────────────────── */
function initPetalosFloral() {
  const wrap = document.getElementById('p2petals');
  if (!wrap) return;

  const colors = ['#f9b8c4','#e8b4d8','#c9a8d4','#f5c6d0','#ddb8e8','#f0a0c0','#e8c0f0'];
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'prev2__petal';
    const size  = Math.random() * 13 + 6;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = [
      'left:'            + Math.random() * 100 + '%',
      'width:'           + size + 'px',
      'height:'          + (size * (Math.random() * .6 + .6)) + 'px',
      'background:'      + color,
      'animation-duration:' + (Math.random() * 10 + 8) + 's',
      'animation-delay:-'   + Math.random() * 14 + 's',
      'opacity:0',
    ].join(';');
    wrap.appendChild(p);
  }
}

/* ── 3. PÉTALOS CHAMPAGNE/DORADOS — BEIGE PREMIUM ───────────── */
function initPetalosBeige() {
  const wrap = document.getElementById('p3petals-phone');
  if (!wrap) return;

  const colors = ['#D8C3A5','#C9A876','#e8d5b0','#f0e4c8','#dfc99a','#e8d4a8','#c8b48a'];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'prev3__petal';
    const size  = Math.random() * 12 + 5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    // Formas variadas: hoja, oval, irregular
    const br = Math.random() > .5
      ? '60% 40% 60% 40%'
      : (Math.random() > .5 ? '30% 70% 30% 70%' : '50% 50% 30% 70%');
    p.style.cssText = [
      'left:'            + Math.random() * 100 + '%',
      'width:'           + size + 'px',
      'height:'          + (size * (Math.random() * .7 + .5)) + 'px',
      'background:'      + color,
      'border-radius:'   + br,
      'animation-duration:' + (Math.random() * 12 + 9) + 's',
      'animation-delay:-'   + Math.random() * 14 + 's',
      'opacity:0',
    ].join(';');
    wrap.appendChild(p);
  }
}

/* ── SCROLL WHEEL EN SCREENS (div, no iframe) ────────────────── */
function initPhoneScroll() {
  ['screen1','screen2','screen3'].forEach(id => {
    const screen = document.getElementById(id);
    if (!screen) return;
    screen.addEventListener('wheel', e => {
      e.preventDefault();
      screen.scrollBy({ top: e.deltaY, behavior: 'auto' });
    }, { passive: false });
    screen.addEventListener('mouseenter', () => screen.style.cursor = 'ns-resize');
    screen.addEventListener('mouseleave', () => screen.style.cursor = '');
  });
}

/* ── COUNTDOWN DISEÑO 1 ──────────────────────────────────────── */
function initCountdown() {
  const FECHA = '2026-09-14T17:00:00';
  function upd() {
    const d = new Date(FECHA) - Date.now();
    if (d <= 0) return;
    const el = id => document.getElementById(id);
    if (el('d1-days'))  el('d1-days').textContent  = String(Math.floor(d/86400000)).padStart(2,'0');
    if (el('d1-hours')) el('d1-hours').textContent = String(Math.floor(d%86400000/3600000)).padStart(2,'0');
    if (el('d1-mins'))  el('d1-mins').textContent  = String(Math.floor(d%3600000/60000)).padStart(2,'0');
    if (el('d1-secs'))  el('d1-secs').textContent  = String(Math.floor(d%60000/1000)).padStart(2,'0');
  }
  upd(); setInterval(upd, 1000);
}

/* ── SCROLL REVEAL ───────────────────────────────────────────── */
function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const delay = parseFloat(e.target.style.transitionDelay || '0') * 1000;
      setTimeout(() => e.target.classList.add('visible'), delay);
      obs.unobserve(e.target);
    });
  }, { threshold: .1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal-up, .benefit-card, .cta-section').forEach(el => obs.observe(el));
}

/* ── MODAL CONTACTO ──────────────────────────────────────────── */
function openContact() {
  document.getElementById('modal-contacto')?.classList.add('open');
  document.body.style.overflow = 'hidden';
  resetContactForm();
}
function closeContact() {
  document.getElementById('modal-contacto')?.classList.remove('open');
  document.body.style.overflow = '';
}
function initContactModal() {
  document.getElementById('close-modal-btn')?.addEventListener('click', closeContact);
  document.getElementById('modal-contacto')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeContact(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeContact(); });
}
function resetContactForm() {
  const f = document.getElementById('contact-form');
  const s = document.getElementById('cf-success');
  const b = document.getElementById('cf-submit');
  f?.querySelectorAll('.form-input').forEach(el => { el.value = ''; el.classList.remove('error','success'); });
  f?.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
  if (s) s.style.display = 'none';
  if (b) { b.style.display = ''; b.disabled = false; b.textContent = 'Enviar mensaje'; b.classList.remove('btn--loading'); }
}

/* ── FORMULARIO CONTACTO ─────────────────────────────────────── */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nombre  = document.getElementById('cf-nombre');
    const email   = document.getElementById('cf-email');
    const mensaje = document.getElementById('cf-mensaje');
    const submit  = document.getElementById('cf-submit');
    const success = document.getElementById('cf-success');
    [nombre,email,mensaje].forEach(el => { el.classList.remove('error'); el.closest('.form-group')?.querySelector('.form-error')?.classList.remove('visible'); });
    let err = false;
    if (!nombre.value.trim() || nombre.value.trim().length < 2) { showErr(nombre,'Ingresa tu nombre'); err = true; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))  { showErr(email,'Correo inválido');  err = true; }
    if (!mensaje.value.trim() || mensaje.value.trim().length < 8) { showErr(mensaje,'Escribe tu mensaje (mín. 8 caracteres)'); err = true; }
    if (err) return;
    submit.disabled = true; submit.textContent = 'Enviando...'; submit.classList.add('btn--loading');
    await new Promise(r => setTimeout(r, 1400));
    submit.style.display = 'none'; success.style.display = 'block';
  });
}
function showErr(input, msg) {
  input.classList.add('error');
  const g = input.closest('.form-group'); if (!g) return;
  let el = g.querySelector('.form-error');
  if (!el) { el = document.createElement('div'); el.className = 'form-error'; g.appendChild(el); }
  el.textContent = '✗ ' + msg; el.classList.add('visible');
}
