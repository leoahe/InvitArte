/* ═══════════════════════════════════════════════════
   INVITARTE — DISEÑO 1 · ELEGANTE NEGRO + DORADO
   JS corregido:
   · Fecha del evento = HOY + 1 AÑO (dinámica)
   · Countdown actualizado en tiempo real
   · Fecha + hora debajo del countdown
   · Música: fix móvil (iOS Safari + Android Chrome)
   · Pétalos dorados y blancos
   · Reveal on scroll
   · Invitado desde URL
═══════════════════════════════════════════════════ */

/* ── FECHA DEL EVENTO — siempre 1 año desde hoy ──
   Si viene ?fecha=2026-12-25 por URL se usa esa,
   si no se calcula automáticamente hoy + 1 año.   */
const params      = new URLSearchParams(location.search);
const fechaParam  = params.get('fecha');

function calcFechaDefault() {
  const h = new Date();
  const e = new Date(h.getFullYear() + 1, h.getMonth(), h.getDate());
  const mm = String(e.getMonth()+1).padStart(2,'0');
  const dd = String(e.getDate()).padStart(2,'0');
  return `${e.getFullYear()}-${mm}-${dd}`;
}

const FECHA_EVENTO = fechaParam || calcFechaDefault();
const HORA_EVENTO  = 'T17:00:00';
const eventDateObj = new Date(FECHA_EVENTO + HORA_EVENTO);

const DIAS_ES   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES_ES  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

function formatFechaLarga(d){
  return `${cap(DIAS_ES[d.getDay()])} ${d.getDate()} de ${cap(MESES_ES[d.getMonth()])} de ${d.getFullYear()}`;
}

/* ── ACTUALIZAR TEXTOS DE FECHA EN EL HTML ── */
// Hero: "14 de Septiembre de 2026"
const fechaEl = document.getElementById('fecha');
if (fechaEl) {
  fechaEl.textContent = `${eventDateObj.getDate()} de ${cap(MESES_ES[eventDateObj.getMonth()])} de ${eventDateObj.getFullYear()}`;
}

// Fecha larga bajo countdown
const eventDateEl = document.querySelector('.event-date');
if (eventDateEl) {
  eventDateEl.textContent = formatFechaLarga(eventDateObj);
}

/* ── COUNTDOWN ── */
function pad(n){ return String(Math.floor(n)).padStart(2,'0'); }

function updateCountdown() {
  const diff = eventDateObj.getTime() - Date.now();
  const cd   = document.getElementById('countdown');
  if (!cd) return;

  if (diff <= 0) {
    cd.innerHTML = `<div class="time">¡Hoy!<br><span>Días</span></div>
      <div class="time">00<br><span>Horas</span></div>
      <div class="time">00<br><span>Min</span></div>
      <div class="time">00<br><span>Seg</span></div>`;
    return;
  }

  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff % 86400000 / 3600000);
  const mins  = Math.floor(diff % 3600000 / 60000);
  const secs  = Math.floor(diff % 60000 / 1000);

  cd.innerHTML = `
    <div class="time">${pad(days)}<br><span>Días</span></div>
    <div class="time">${pad(hours)}<br><span>Horas</span></div>
    <div class="time">${pad(mins)}<br><span>Min</span></div>
    <div class="time">${pad(secs)}<br><span>Seg</span></div>`;
}
updateCountdown();
setInterval(updateCountdown, 1000);

/* ── MÚSICA — fix móvil (iOS Safari + Android Chrome) ──
   Misma estrategia probada en Diseño 2:
   · <audio muted> en HTML para que el elemento se active sin gesto
   · play() llamado DIRECTAMENTE en touchend/click (mismo tick)
   · Se quita muted justo antes del play() → suena en móvil
   · touchend además de click cubre iOS Safari                     */
const music    = document.getElementById('music');
const musicBtn = document.getElementById('musicBtn');
let isPlaying  = false;
let userStarted = false;

function setPlayUI() {
  isPlaying = true;
  if (musicBtn) { musicBtn.textContent = '🔊'; musicBtn.classList.add('playing'); }
}
function setPauseUI() {
  isPlaying = false;
  if (musicBtn) { musicBtn.textContent = '🔇'; musicBtn.classList.remove('playing'); }
}

function playNow() {
  if (!music) return;
  music.muted  = false;
  music.volume = 0.3;
  const p = music.play();
  if (p !== undefined) {
    p.then(() => { setPlayUI(); userStarted = true; })
     .catch(() => { setPauseUI(); });
  } else {
    setPlayUI();
  }
}

function toggleMusic() {
  if (isPlaying) {
    music.pause();
    setPauseUI();
  } else {
    playNow();
  }
}

if (musicBtn) {
  musicBtn.addEventListener('click',    (e) => { e.stopPropagation(); toggleMusic(); });
  musicBtn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); toggleMusic(); }, { passive: false });
}

// Intento de autoplay al primer toque en cualquier parte
function tryAutoplay() {
  if (!userStarted) playNow();
  document.removeEventListener('click',    tryAutoplay);
  document.removeEventListener('touchend', tryAutoplay);
}
document.addEventListener('click',    tryAutoplay, { once: true });
document.addEventListener('touchend', tryAutoplay, { once: true, passive: true });

if (music) {
  music.addEventListener('pause', () => { if (isPlaying) setPauseUI(); });
  music.addEventListener('play',  () => { if (!isPlaying) setPlayUI(); });
  music.addEventListener('error', () => {
    if (musicBtn) { musicBtn.disabled = true; musicBtn.style.opacity = '.4'; }
  });
}

/* ── PÉTALOS ── */
const petals = document.getElementById('petals');
if (petals) {
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'petal';
    p.style.left            = Math.random() * 100 + '%';
    p.style.animationDuration = (8 + Math.random() * 8) + 's';
    p.style.animationDelay  = (-Math.random() * 12) + 's';
    petals.appendChild(p);
  }
}

/* ── PARTÍCULAS DORADAS ── */
const goldWrap = document.getElementById('goldParticles');
if (goldWrap) {
  for (let i = 0; i < 18; i++) {
    const g = document.createElement('div');
    g.className = 'gold';
    g.style.left            = Math.random() * 100 + '%';
    g.style.animationDuration = (12 + Math.random() * 10) + 's';
    g.style.animationDelay  = (Math.random() * 10) + 's';
    goldWrap.appendChild(g);
  }
}

/* ── REVEAL ON SCROLL ── */
const revealEls = document.querySelectorAll('.reveal');
const doReveal  = () => {
  revealEls.forEach(r => {
    if (r.getBoundingClientRect().top < window.innerHeight - 100) {
      r.classList.add('show');
    }
  });
};
window.addEventListener('scroll', doReveal, { passive: true });
doReveal();

/* ── INVITADO DESDE URL ── */
const invitado = params.get('invitado') || 'Nuestros invitados especiales';
const pases    = params.get('pases')    || '';
const gName    = document.getElementById('guestName');
const gPasses  = document.getElementById('guestPasses');
if (gName)   gName.textContent   = decodeURIComponent(invitado);
if (gPasses) gPasses.textContent = pases ? `Número de pases: ${pases}` : '';

/* ── DECORACIÓN ── */
const decoracion = document.getElementById('decoracion');
if (decoracion) decoracion.style.background = '#c8a96a';
