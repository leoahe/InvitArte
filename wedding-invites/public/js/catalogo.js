/*

const modal = document.getElementById('previewModal');
const frame = document.getElementById('previewFrame');
const closeBtn = document.getElementById('closePreview');

// Abrir modal
document.querySelectorAll('.btn-preview').forEach(btn => {
  btn.addEventListener('click', () => {
    const url = btn.dataset.preview;
    frame.src = url;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
});

// Cerrar modal
closeBtn.addEventListener('click', cerrarModal);

modal.addEventListener('click', e => {
  if (e.target === modal) cerrarModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') cerrarModal();
});

function cerrarModal() {
  modal.style.display = 'none';
  frame.src = '';
  document.body.style.overflow = '';
}*/


/*
// ===============================
// ANIMACIÓN DE ENTRADA (SCROLL)
// ===============================
const items = document.querySelectorAll('.catalogo-item');

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.15
  }
);

items.forEach(item => observer.observe(item));

// ===============================
// MODAL PREVIEW
// ===============================
const modal = document.getElementById('previewModal');
const frame = document.getElementById('previewFrame');
const closeBtn = document.getElementById('closePreview');

document.querySelectorAll('.btn-preview').forEach(btn => {
  btn.addEventListener('click', () => {
    frame.src = btn.dataset.preview;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
});

closeBtn.addEventListener('click', cerrarModal);

modal.addEventListener('click', e => {
  if (e.target === modal) cerrarModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') cerrarModal();
});

function cerrarModal() {
  modal.style.display = 'none';
  frame.src = '';
  document.body.style.overflow = '';
}
*/


// ===============================
// PREVIEW iPHONE MODAL
// ===============================

// ===============================
// ESPERAR A QUE EL DOM ESTÉ LISTO
// ===============================
document.addEventListener('DOMContentLoaded', () => {

  console.log('catalogo.js cargado correctamente');

  // ===============================
  // ANIMACIÓN DE ENTRADA (SCROLL)
  // ===============================
  const items = document.querySelectorAll('.catalogo-item');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  items.forEach(item => observer.observe(item));

  // ===============================
  // PREVIEW iPHONE MODAL
  // ===============================
  const modal = document.getElementById('previewModal');
  const frame = document.getElementById('previewFrame');
  const closeBtn = document.getElementById('closePreview');

  if (!modal || !frame || !closeBtn) {
    console.warn('Modal preview no encontrado, se omite lógica del modal');
    return;
  }

  document.querySelectorAll('.btn-preview').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.preview;
      if (!url) return;

      frame.src = url;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
  });

  closeBtn.addEventListener('click', cerrarModal);

  modal.addEventListener('click', e => {
    if (e.target === modal) cerrarModal();
  });

  function cerrarModal() {
    modal.style.display = 'none';
    frame.src = '';
    document.body.style.overflow = '';
  }

});
