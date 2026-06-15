/**
 * INVITARTE — HOME.JS
 * Scroll corregido iframes desktop + partículas + navbar + modal contacto
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initParticles();
  initPhoneScroll();
  initScrollReveal();
  initContactModal();
  initContactForm();
  setTimeout(() => {
    document.querySelectorAll('.phone-wrapper').forEach(pw => pw.classList.add('visible'));
  }, 350);
});

/* ── NAVBAR ── */
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (nav) window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 50), {passive:true});
  const burger = document.getElementById('burger');
  const menu   = document.getElementById('mobile-menu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      const ss = burger.querySelectorAll('span');
      ss[0].style.transform = open ? 'rotate(45deg) translate(5px,5px)' : '';
      ss[1].style.opacity   = open ? '0' : '';
      ss[2].style.transform = open ? 'rotate(-45deg) translate(5px,-5px)' : '';
    });
  }
  window.addEventListener('scroll', () => menu?.classList.remove('open'), {passive:true});
  ['nav-contacto-btn','mob-contacto-btn','hero-contacto-btn','cta-contacto-btn','footer-contacto-btn'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', openContact));
}

/* ── PARTÍCULAS CLARAS ── */
function initParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, pts = [], raf;
  const resize = () => { W = canvas.width = canvas.offsetWidth || window.innerWidth; H = canvas.height = canvas.offsetHeight || window.innerHeight; };
  resize();
  window.addEventListener('resize', resize, {passive:true});
  for (let i = 0; i < 50; i++) pts.push(mkPt(Math.random()*1200, Math.random()*800));
  function mkPt(x, y) {
    return {x, y, size: Math.random()*2+.3, speedX:(Math.random()-.5)*.25, speedY:-(Math.random()*.35+.08), opacity:Math.random()*.32+.05, life:1, decay:Math.random()*.0015+.0004};
  }
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
  const hero = document.getElementById('hero');
  if (hero) new IntersectionObserver(e => { if(e[0].isIntersecting){if(!raf)draw();}else{cancelAnimationFrame(raf);raf=null;} }).observe(hero);
}

/* ── SCROLL EN IFRAMES (SOLUCIÓN DESKTOP) ──
   Problema: iframe con pointer-events:none bloquea wheel en desktop.
   Solución: capturar wheel en .iphone__screen y hacer scrollBy compensando la escala.
   En móvil: overflow-y:scroll del contenedor funciona con touch nativamente.
*/
function initPhoneScroll() {
  const configs = [
    {id:'screen1', scale: 210/390},   // 0.5385
    {id:'screen2', scale: 248/390},   // 0.636  (featured)
    {id:'screen3', scale: 210/390},
  ];
  configs.forEach(({id, scale}) => {
    const screen = document.getElementById(id);
    if (!screen) return;
    // wheel → scrollBy compensado por escala
    screen.addEventListener('wheel', e => {
      e.preventDefault();
      e.stopPropagation();
      screen.scrollBy({top: e.deltaY / scale, behavior:'auto'});
    }, {passive:false});
    // cursor hint
    screen.addEventListener('mouseenter', () => screen.style.cursor = 'ns-resize');
    screen.addEventListener('mouseleave', () => screen.style.cursor = '');
  });
  // Ajustar altura del iframe según contenido real (same-origin)
  ['iframe1','iframe2','iframe3'].forEach((iid, idx) => {
    const iframe = document.getElementById(iid);
    if (!iframe) return;
    const scale = idx === 1 ? 248/390 : 210/390;
    const sid   = ['screen1','screen2','screen3'][idx];
    const screen = document.getElementById(sid);
    const adjust = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc?.body) return;
        const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, 900);
        iframe.style.height = h + 'px';
      } catch(e) { /* cross-origin: altura fija 900px, funciona para preview */ }
    };
    iframe.addEventListener('load', adjust);
    setTimeout(adjust, 2000);
    setTimeout(adjust, 5000);
  });
}

/* ── REVEAL SCROLL ── */
function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const delay = parseFloat(e.target.style.transitionDelay||'0')*1000;
      setTimeout(() => e.target.classList.add('visible'), delay);
      obs.unobserve(e.target);
    });
  }, {threshold:.1, rootMargin:'0px 0px -50px 0px'});
  document.querySelectorAll('.reveal-up, .benefit-card, .cta-section').forEach(el => obs.observe(el));
}

/* ── MODAL CONTACTO ── */
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
  document.getElementById('modal-contacto')?.addEventListener('click', e => { if(e.target===e.currentTarget) closeContact(); });
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeContact(); });
}
function resetContactForm() {
  const f = document.getElementById('contact-form');
  const s = document.getElementById('cf-success');
  const b = document.getElementById('cf-submit');
  f?.querySelectorAll('.form-input').forEach(el => { el.value=''; el.classList.remove('error','success'); });
  f?.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
  if(s) s.style.display='none';
  if(b) { b.style.display=''; b.disabled=false; b.textContent='Enviar mensaje'; b.classList.remove('btn--loading'); }
}

/* ── FORMULARIO CONTACTO ── */
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
    if (!nombre.value.trim()||nombre.value.trim().length<2) { showErr(nombre,'Ingresa tu nombre'); err=true; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { showErr(email,'Correo inválido'); err=true; }
    if (!mensaje.value.trim()||mensaje.value.trim().length<8) { showErr(mensaje,'Escribe tu mensaje (mín. 8 caracteres)'); err=true; }
    if (err) return;
    submit.disabled=true; submit.textContent='Enviando...'; submit.classList.add('btn--loading');
    await new Promise(r=>setTimeout(r,1400));
    submit.style.display='none'; success.style.display='block';
    console.log('Contacto:', {nombre:nombre.value.trim(), email:email.value.trim(), mensaje:mensaje.value.trim()});
  });
}
function showErr(input, msg) {
  input.classList.add('error');
  const g = input.closest('.form-group'); if(!g) return;
  let el = g.querySelector('.form-error');
  if(!el){el=document.createElement('div');el.className='form-error';g.appendChild(el);}
  el.textContent='✗ '+msg; el.classList.add('visible');
}
