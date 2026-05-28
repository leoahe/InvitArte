/**
 * INVITARTE — PLANTILLA2.JS
 * Diseño Premium — Lógica completa:
 * - Nombre de invitado por URL (?invitado=Juan)
 * - Cuenta regresiva
 * - Música autoplay con botón
 * - Vigencia de 3 meses desde hoy
 * - Pétalos animados
 * - Partículas doradas
 * - Reveal on scroll
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. PARÁMETROS DE URL ────────────────── */
  const params    = new URLSearchParams(window.location.search);
  const invitado  = params.get('invitado');
  const pases     = params.get('pases') || '1';
  const fechaEvento = '2026-09-14'; // ← Cambia esto por la fecha real del evento

  /* ── 2. NOMBRE DEL INVITADO ──────────────── */
  const guestNameEl  = document.getElementById('guestName');
  const guestPassEl  = document.getElementById('guestPasses');
  const secInvitado  = document.getElementById('seccion-invitado');

  if (invitado && invitado.trim()) {
    guestNameEl.textContent = decodeURIComponent(invitado);
    const n = parseInt(pases);
    guestPassEl.textContent = n > 1
      ? `✦ ${n} pases reservados para ti`
      : '✦ 1 pase reservado para ti';
  } else {
    // Sin nombre en URL: ocultar sección invitado en vista previa
    if (secInvitado) secInvitado.style.display = 'none';
  }

  /* ── 3. VIGENCIA 3 MESES ─────────────────── */
  const hoy         = new Date();
  const vigenciaFin = new Date(hoy);
  vigenciaFin.setMonth(vigenciaFin.getMonth() + 3);

  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const vigenciaStr = `${vigenciaFin.getDate()} de ${meses[vigenciaFin.getMonth()]} de ${vigenciaFin.getFullYear()}`;

  const vigenciaBadge = document.getElementById('vigencia-fecha');
  const vigenciaHasta = document.getElementById('vigencia-hasta');

  if (vigenciaBadge) vigenciaBadge.textContent = vigenciaStr;
  if (vigenciaHasta) vigenciaHasta.textContent = `Válida hasta: ${vigenciaStr}`;

  /* ── 4. CUENTA REGRESIVA ─────────────────── */
  const countdownEl = document.getElementById('countdown');

  function updateCountdown() {
    if (!countdownEl) return;

    const target = new Date(fechaEvento + 'T17:00:00').getTime();
    const now    = Date.now();
    const diff   = target - now;

    if (diff <= 0) {
      countdownEl.innerHTML = `
        <div class="time" style="padding:20px 30px">
          <span style="font-size:1.4rem">🎊</span>
          <small>¡Hoy es el gran día!</small>
        </div>
      `;
      return;
    }

    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000)  / 60000);
    const seconds = Math.floor((diff % 60000)    / 1000);

    countdownEl.innerHTML = `
      <div class="time"><span>${days}</span><small>Días</small></div>
      <div class="time"><span>${hours}</span><small>Hrs</small></div>
      <div class="time"><span>${minutes}</span><small>Min</small></div>
      <div class="time"><span>${seconds}</span><small>Seg</small></div>
    `;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ── 5. MÚSICA ───────────────────────────── */
  const music    = document.getElementById('music');
  const musicBtn = document.getElementById('musicBtn');
  let   playing  = false;

  // Autoplay al primer toque del usuario
  const tryAutoplay = () => {
    if (!playing && music) {
      music.volume = 0.35;
      music.play()
        .then(() => {
          playing = true;
          musicBtn.textContent = '🎵';
        })
        .catch(() => {}); // bloqueado por el navegador — esperamos clic
    }
    document.removeEventListener('touchstart', tryAutoplay);
    document.removeEventListener('click', tryAutoplay);
  };

  document.addEventListener('touchstart', tryAutoplay, { once: true });
  document.addEventListener('click', tryAutoplay, { once: true });

  if (musicBtn) {
    musicBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!music) return;
      if (playing) {
        music.pause();
        playing = false;
        musicBtn.textContent = '🔇';
      } else {
        music.play().catch(() => {});
        playing = true;
        musicBtn.textContent = '🎵';
      }
    });
  }

  /* ── 6. PÉTALOS ANIMADOS ─────────────────── */
  const petalsContainer = document.getElementById('petals');
  if (petalsContainer) {
    const colores = [
      'radial-gradient(circle, #e8c4bf, #d4a5a0)',
      'radial-gradient(circle, #f0d9a6, #c8a96a)',
      'radial-gradient(circle, #f3e2d5, #e9d1c3)',
    ];

    for (let i = 0; i < 20; i++) {
      const petal = document.createElement('div');
      petal.classList.add('petal');

      const size  = Math.random() * 12 + 8;
      const left  = Math.random() * 100;
      const dur   = Math.random() * 10 + 8;
      const delay = Math.random() * 12;
      const color = colores[Math.floor(Math.random() * colores.length)];

      petal.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${left}%;
        top: -20px;
        background: ${color};
        animation-duration: ${dur}s;
        animation-delay: -${delay}s;
      `;
      petalsContainer.appendChild(petal);
    }
  }

  /* ── 7. PARTÍCULAS DORADAS ───────────────── */
  const particlesContainer = document.getElementById('goldParticles');
  if (particlesContainer) {
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');

      const size  = Math.random() * 3 + 1;
      const left  = Math.random() * 100;
      const dur   = Math.random() * 15 + 10;
      const delay = Math.random() * 15;

      p.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${left}%;
        top: -10px;
        background: radial-gradient(circle, #f0d9a6, #c8a96a);
        border-radius: 50%;
        opacity: ${Math.random() * 0.6 + 0.2};
        animation: fall ${dur}s linear -${delay}s infinite;
      `;
      particlesContainer.appendChild(p);
    }
  }

  /* ── 8. REVEAL ON SCROLL ─────────────────── */
  const reveals = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  reveals.forEach(el => observer.observe(el));

  /* ── 9. FADE IN inicial ──────────────────── */
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.8s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
    });
  });

});
