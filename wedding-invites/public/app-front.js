// app-front.js
async function fetchTemplates(){
  const res = await fetch('/api/templates');
  return await res.json();
}

async function initFront(){
  const templates = await fetchTemplates();
  const grid = document.getElementById('preview-grid');
  if(grid){
    grid.innerHTML = '';
    templates.slice(0,3).forEach(t=>{
      const d = document.createElement('div');
      d.className = 'card';
      d.innerHTML = '<img src="'+t.img+'" style="width:100%;border-radius:8px"/><h4>'+t.title+'</h4><div class="small">'+t.description+'</div>';
      grid.appendChild(d);
    });
  }
  const samples = document.getElementById('samples-grid');
  if(samples){
    samples.innerHTML = '';
    templates.forEach(t=>{
      const img = document.createElement('img');
      img.src = t.img;
      img.alt = t.title;
      samples.appendChild(img);
    });
  }
}
document.addEventListener('DOMContentLoaded', initFront);

// burger
document.addEventListener('click', (e) => {
  if(e.target.id === 'burger' || e.target.id === 'burger-2'){
    const id = e.target.id === 'burger' ? 'nav-links' : 'nav-links-2';
    const el = document.getElementById(id);
    if(el) el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
  }
});
