/* ═══════════════════════════════════════════════
   INVITARTE — PLANTILLA 4 · JARDÍN IMPERIAL
   Reutiliza la misma arquitectura JS probada
═══════════════════════════════════════════════ */
const params     = new URLSearchParams(location.search);
const fechaParam = params.get('fecha');

function calcFechaDefault() {
  const h = new Date();
  const e = new Date(h.getFullYear()+1, h.getMonth(), h.getDate());
  return `${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,'0')}-${String(e.getDate()).padStart(2,'0')}`;
}
const FECHA_EVENTO = fechaParam || calcFechaDefault();
const eventDateObj = new Date(FECHA_EVENTO + 'T17:00:00');
const DIAS_ES  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

/* ── FECHAS ── */
const fechaEl = document.getElementById('fecha-display');
if (fechaEl) fechaEl.textContent = `${cap(DIAS_ES[eventDateObj.getDay()])} · ${eventDateObj.getDate()} de ${cap(MESES_ES[eventDateObj.getMonth()])} de ${eventDateObj.getFullYear()}`;

const eventDateEl = document.getElementById('event-date-display');
if (eventDateEl) eventDateEl.textContent = `${cap(DIAS_ES[eventDateObj.getDay()])} ${eventDateObj.getDate()} de ${cap(MESES_ES[eventDateObj.getMonth()])} de ${eventDateObj.getFullYear()}`;

const rsvpDate = new Date(eventDateObj);
rsvpDate.setMonth(rsvpDate.getMonth()-1);
const rsvpEl = document.getElementById('rsvp-deadline');
if (rsvpEl) rsvpEl.textContent = `${rsvpDate.getDate()} de ${cap(MESES_ES[rsvpDate.getMonth()])}`;

const footerYearEl = document.getElementById('footer-year');
if (footerYearEl) footerYearEl.textContent = eventDateObj.getFullYear();
const noviaFooter = document.getElementById('nombre-novia-footer');
const novioFooter = document.getElementById('nombre-novio-footer');
if (noviaFooter) noviaFooter.textContent = document.getElementById('nombre-novia')?.textContent || 'Sofia';
if (novioFooter) novioFooter.textContent = document.getElementById('nombre-novio')?.textContent || 'Mateo';

/* ── INVITADO ── */
const invitado = params.get('invitado');
const pases    = parseInt(params.get('pases'))||1;
const secInv   = document.getElementById('sec-invitado');
const gName    = document.getElementById('guestName');
const gPass    = document.getElementById('guestPasses');
if (invitado && invitado.trim()) {
  if(gName) gName.textContent = decodeURIComponent(invitado);
  if(gPass) gPass.textContent = pases>1?`✿ ${pases} pases reservados`:'✿ 1 pase reservado';
} else {
  if(secInv) secInv.style.display='none';
}

/* ── COUNTDOWN ── */
function pad(n){ return String(Math.floor(n)).padStart(2,'0'); }
function updateCD(){
  const diff = eventDateObj.getTime()-Date.now();
  if(diff<=0){
    ['cd-days','cd-hours','cd-minutes','cd-seconds'].forEach((id,i)=>{
      const el=document.getElementById(id);
      if(el) el.textContent = i===0?'¡Hoy!':'00';
    });
    return;
  }
  const d=document.getElementById('cd-days'),   h=document.getElementById('cd-hours'),
        m=document.getElementById('cd-minutes'), s=document.getElementById('cd-seconds');
  if(d) d.textContent=pad(diff/86400000);
  if(h) h.textContent=pad(diff%86400000/3600000);
  if(m) m.textContent=pad(diff%3600000/60000);
  if(s) s.textContent=pad(diff%60000/1000);
}
updateCD(); setInterval(updateCD,1000);

/* ── MÚSICA — fix móvil ── */
const music    = document.getElementById('music');
const musicBtn = document.getElementById('musicBtn');
let isPlaying=false, userStarted=false;
function setPlayUI() { isPlaying=true;  if(musicBtn){musicBtn.textContent='♫';musicBtn.classList.remove('muted');} }
function setPauseUI(){ isPlaying=false; if(musicBtn){musicBtn.textContent='♪';musicBtn.classList.add('muted');} }
function playNow(){
  if(!music)return;
  music.muted=false; music.volume=0.28;
  const p=music.play();
  if(p!==undefined) p.then(()=>{setPlayUI();userStarted=true;}).catch(()=>setPauseUI());
  else setPlayUI();
}
function toggleMusic(){ if(isPlaying){music.pause();setPauseUI();}else playNow(); }
if(musicBtn){
  musicBtn.addEventListener('click',   (e)=>{e.stopPropagation();toggleMusic();});
  musicBtn.addEventListener('touchend',(e)=>{e.preventDefault();e.stopPropagation();toggleMusic();},{passive:false});
}
function tryAutoplay(){ if(!userStarted)playNow(); document.removeEventListener('click',tryAutoplay); document.removeEventListener('touchend',tryAutoplay); }
document.addEventListener('click',   tryAutoplay,{once:true});
document.addEventListener('touchend',tryAutoplay,{once:true,passive:true});
if(music){
  music.addEventListener('pause',()=>{if(isPlaying)setPauseUI();});
  music.addEventListener('play', ()=>{if(!isPlaying)setPlayUI();});
  music.addEventListener('error',()=>{if(musicBtn){musicBtn.disabled=true;musicBtn.style.opacity='.4';}});
}

/* ── PARTÍCULAS — hojas y doradas ── */
const wrap = document.getElementById('rb-particles');
if(wrap){
  for(let i=0;i<30;i++){
    const el=document.createElement('div');
    el.className = i<18 ? 'rb-petal' : 'rb-spark';
    const size = i<18 ? (Math.random()*8+6)+'px' : '3px';
    el.style.cssText=[
      `left:${Math.random()*100}%`,
      `width:${size}`,`height:${i<18?(Math.random()*10+8)+'px':size}`,
      `animation-duration:${Math.random()*12+10}s`,
      `animation-delay:-${Math.random()*14}s`,
      i<18?`transform:rotate(${Math.random()*60-30}deg)`:''
    ].filter(Boolean).join(';');
    wrap.appendChild(el);
  }
}

/* ── REVEAL ── */
const revEls=document.querySelectorAll('.reveal');
const doReveal=()=>revEls.forEach(r=>{ if(r.getBoundingClientRect().top<window.innerHeight-80)r.classList.add('show'); });
window.addEventListener('scroll',doReveal,{passive:true}); doReveal();

/* ── RSVP ── */
window.rsvpRB=(resp,btn)=>{
  const msg=document.getElementById('rsvp-msg');
  document.querySelectorAll('.rb-rsvp-btn').forEach(b=>b.disabled=true);
  if(resp==='si'){btn.style.background='var(--rb-dorado)';msg.textContent='¡Gracias! Te esperamos con mucho cariño. ✿';}
  else{msg.textContent='Lo entendemos. Te enviamos todo nuestro amor. ✿';}
  if(msg)msg.style.opacity='1';
};
