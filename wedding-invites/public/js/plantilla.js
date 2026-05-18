/* PETALOS */
const petals=document.getElementById("petals");
for(let i=0;i<25;i++){
  const p=document.createElement("div");
  p.className="petal";
  p.style.left=Math.random()*100+"%";
  p.style.animationDuration=8+Math.random()*8+"s";
  petals.appendChild(p);
}

/* REVEAL */
const reveals=document.querySelectorAll(".reveal");
const revealScroll=()=>{
  reveals.forEach(r=>{
    if(r.getBoundingClientRect().top < window.innerHeight-120){
      r.classList.add("show");
    }
  });
};
window.addEventListener("scroll",revealScroll);
revealScroll();



/* COUNTDOWN */
const eventDate=new Date("2026-09-14T17:00:00").getTime();
const countdown=document.getElementById("countdown");
setInterval(()=>{
  const d=Math.max(0,eventDate-Date.now());
  countdown.innerHTML=`
    <div class="time">${Math.floor(d/86400000)}<br>Días</div>
    <div class="time">${Math.floor(d/3600000)%24}<br>Horas</div>
    <div class="time">${Math.floor(d/60000)%60}<br>Min</div>
    <div class="time">${Math.floor(d/1000)%60}<br>Seg</div>`;
},1000);

/* MUSIC 
const music=document.getElementById("music");
document.getElementById("musicBtn").onclick=()=>{
  music.paused?music.play():music.pause();
};
*/
const music = document.getElementById("music");
const btn = document.getElementById("musicBtn");

music.volume = 0;

const fadeIn = () => {
  let v = 0;
  music.play();
  const i = setInterval(()=>{
    if(v >= .6){ clearInterval(i); }
    music.volume = v;
    v += .02;
  },100);
};

const fadeOut = () => {
  let v = music.volume;
  const i = setInterval(()=>{
    if(v <= 0){
      clearInterval(i);
      music.pause();
    }
    music.volume = v;
    v -= .02;
  },100);
};

btn.onclick = ()=>{
  music.paused ? fadeIn() : fadeOut();
};



/* INVITADO */
const params=new URLSearchParams(location.search);
const invitado=params.get("invitado")||"Nuestros invitados especiales";
const pases=params.get("pases")||"";
document.getElementById("guestName").innerText=invitado;
document.getElementById("guestPasses").innerText=
  pases?`Número de pases: ${pases}`:"";

/* WHATSAPP */
document.getElementById("btnConfirmar").onclick=()=>{
  const msg=`Hola, somos ${invitado}. Confirmamos nuestra asistencia 🖤`;
  window.open(`https://wa.me/521XXXXXXXXXX?text=${encodeURIComponent(msg)}`);
};

/* DECORACION */
const decoracion=document.getElementById("decoracion");
if(decoracion)decoracion.style.background="#c8a96a";


/* PARTICULAS DORADAS */
const goldWrap = document.getElementById("goldParticles");

for(let i=0;i<18;i++){
  const g = document.createElement("div");
  g.className = "gold";
  g.style.left = Math.random()*100 + "%";
  g.style.animationDuration = 12 + Math.random()*10 + "s";
  g.style.animationDelay = Math.random()*10 + "s";
  goldWrap.appendChild(g);
}


/* CTA LO QUIERO 
const btnQuiero = document.getElementById("btnQuiero");

if(btnQuiero){
  btnQuiero.addEventListener("click", () => {
    window.location.href = "/precios.html?diseno=1";
  });
}
*/
/* BOTON LO QUIERO */

const btnQuiero = document.getElementById("btnQuiero");

if(btnQuiero){
  btnQuiero.addEventListener("click", function(){

    window.location.href = "/precios.html?diseno=1";

  });
}