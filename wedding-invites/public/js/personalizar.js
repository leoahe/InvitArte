/**
 * INVITARTE — PERSONALIZAR.JS
 * Formulario de personalización con:
 * - Preview en tiempo real
 * - Autosave cada 3 segundos
 * - Gestión de pasos
 * - Carga/guardado desde InvitArteDB
 */

let currentUser    = null;
let invitationId   = null;
let currentData    = {};
let autoSaveTimer  = null;
let currentStep    = 0;
let photos         = [];
let selectedMusic  = null;
let selectedColor  = '#c9a84c';
let selectedFont   = 'clasico';
let selectedTemplate = 'clasico';

const MUSIC_TRACKS = [
  { id: 'canon',     title: 'Canon in D',           artist: 'Johann Pachelbel',   url: '' },
  { id: 'moonlight', title: 'Moonlight Sonata',      artist: 'Ludwig van Beethoven', url: '' },
  { id: 'nuvole',    title: 'Nuvole Bianche',        artist: 'Ludovico Einaudi',   url: '' },
  { id: 'river',     title: 'River Flows in You',    artist: 'Yiruma',             url: '' },
  { id: 'experience',title: 'Experience',            artist: 'Ludovico Einaudi',   url: '' },
  { id: 'una-mattina',title: 'Una Mattina',          artist: 'Ludovico Einaudi',   url: '' },
];

const COLOR_PALETTE = [
  { name: 'Dorado Clásico', value: '#c9a84c' },
  { name: 'Rosa Palo',      value: '#d4a5a0' },
  { name: 'Blanco Perla',   value: '#f0ebe3' },
  { name: 'Azul Royal',     value: '#4a6fa5' },
  { name: 'Verde Salvia',   value: '#7a9e87' },
  { name: 'Borgoña',        value: '#800020' },
  { name: 'Lavanda',        value: '#9b89b0' },
  { name: 'Negro Puro',     value: '#f5f0e8' },
];

/* ── INIT ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  Loader.show();

  currentUser = await Auth.requireLogin('/login.html');
  if (!currentUser) return;

  // Check if editing existing invitation
  const params = new URLSearchParams(window.location.search);
  invitationId = params.get('id');

  // Build UI
  buildTemplateGrid();
  buildMusicList();
  buildColorPalette();

  // Load existing data if editing
  if (invitationId) {
    await loadExistingInvitation();
  } else {
    // Set defaults
    currentData = {
      novia: '', novio: '', frase: '',
      fecha: '', hora: '18:00',
      lugarCeremonia: '', lugarRecepcion: '',
      template: 'clasico', color: selectedColor,
      musica: null, fotos: [],
    };
  }

  // Setup live preview listeners
  setupPreviewListeners();

  // Setup file upload
  setupFileUpload();

  // Autosave
  setupAutosave();

  Loader.hide();
});

/* ── TEMPLATE GRID ───────────────────────── */
function buildTemplateGrid() {
  const grid = document.getElementById('template-grid');
  if (!grid) return;

  grid.innerHTML = TEMPLATES.map(t => `
    <div class="template-card ${t.id === 'clasico' ? 'selected' : ''}"
         data-template="${t.id}"
         onclick="selectTemplate('${t.id}', this)">
      <div class="template-card__preview">
        <div class="template-card__preview-bg"></div>
        <div class="template-card__preview-text">A &amp; B</div>
        <div class="template-card__check">✓</div>
      </div>
      <div class="template-card__label">${t.nombre}</div>
    </div>
  `).join('');
}

/* ── MUSIC LIST ──────────────────────────── */
function buildMusicList() {
  const list = document.getElementById('music-list');
  if (!list) return;

  list.innerHTML = MUSIC_TRACKS.map(track => `
    <div class="music-item" data-id="${track.id}" onclick="selectMusic('${track.id}', this)">
      <div class="music-item__play">▶</div>
      <div class="music-item__info">
        <div class="music-item__title">${track.title}</div>
        <div class="music-item__artist">${track.artist}</div>
      </div>
      <div class="music-item__check">✓</div>
    </div>
  `).join('');
}

/* ── COLOR PALETTE ───────────────────────── */
function buildColorPalette() {
  const palette = document.getElementById('color-palette');
  if (!palette) return;

  palette.innerHTML = COLOR_PALETTE.map(c => `
    <div class="color-swatch ${c.value === '#c9a84c' ? 'active' : ''}"
         title="${c.name}"
         style="background:${c.value}"
         onclick="selectColor('${c.value}', this)">
    </div>
  `).join('');
}

/* ── LOAD EXISTING INVITATION ────────────── */
async function loadExistingInvitation() {
  try {
    const inv = await InvitArteDB.invitations.getById(invitationId);
    if (!inv || inv.userId !== currentUser.id) {
      Toast.error('Invitación no encontrada');
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
      return;
    }

    currentData = { ...inv };

    // Fill form fields
    setField('novia',              inv.novia);
    setField('novio',              inv.novio);
    setField('frase',              inv.frase);
    setField('historia',           inv.historia);
    setField('fecha',              inv.fecha);
    setField('hora',               inv.hora);
    setField('lugarCeremonia',     inv.lugarCeremonia);
    setField('lugarRecepcion',     inv.lugarRecepcion);
    setField('direccionCeremonia', inv.direccionCeremonia);
    setField('horaCeremonia',      inv.horaCeremonia);
    setField('mapsCeremonia',      inv.mapsCeremonia);
    setField('direccionRecepcion', inv.direccionRecepcion);
    setField('horaRecepcion',      inv.horaRecepcion);
    setField('mapsRecepcion',      inv.mapsRecepcion);
    setField('musicaUrl',          inv.musicaUrl);

    // Template
    if (inv.template) {
      selectTemplate(inv.template,
        document.querySelector(`[data-template="${inv.template}"]`));
    }

    // Color
    if (inv.color) selectColor(inv.color,
      document.querySelector(`[title]`));

    // Music
    if (inv.musica) selectMusic(inv.musica,
      document.querySelector(`[data-id="${inv.musica}"]`));

    // Update title
    if (inv.novia && inv.novio) {
      document.getElementById('pform-title').textContent =
        `${inv.novia} & ${inv.novio}`;
    }

    // Update live preview
    updatePreview();

  } catch (err) {
    Toast.error('Error al cargar la invitación');
  }
}

const setField = (id, val) => {
  const el = document.getElementById(`field-${id}`);
  if (el && val) el.value = val;
};

/* ── STEP NAVIGATION ─────────────────────── */
window.goToStep = (n) => {
  // Mark previous step as completed
  const prevItem = document.querySelector(`.step-item[data-step="${currentStep}"]`);
  if (prevItem) prevItem.classList.add('completed');

  // Hide current step
  document.getElementById(`step-${currentStep}`).classList.remove('active');

  // Show new step
  currentStep = n;
  document.getElementById(`step-${n}`).classList.add('active');

  // Update step UI
  document.querySelectorAll('.step-item').forEach(item => {
    const s = parseInt(item.dataset.step);
    item.classList.toggle('active', s === n);
  });

  // Scroll form panel to top
  document.querySelector('.pform-panel').scrollTop = 0;

  // Trigger autosave
  triggerAutosave();
};

/* ── LIVE PREVIEW ────────────────────────── */
function setupPreviewListeners() {
  // All fields with data-preview attribute
  document.querySelectorAll('[data-preview]').forEach(el => {
    el.addEventListener('input', updatePreview);
  });

  // Date field (without data-preview since it needs formatting)
  const fechaEl = document.getElementById('field-fecha');
  if (fechaEl) fechaEl.addEventListener('change', updatePreview);
}

function updatePreview() {
  const novia = getVal('novia') || 'Novia';
  const novio = getVal('novio') || 'Novio';
  const fecha = getVal('fecha');
  const frase = getVal('frase');
  const lugarCeremonia  = getVal('lugarCeremonia');
  const lugarRecepcion  = getVal('lugarRecepcion');

  // Names
  el('lp-novia').textContent = novia.split(' ')[0] || novia;
  el('lp-novio').textContent = novio.split(' ')[0] || novio;

  // Phrase
  el('lp-phrase').textContent = frase || 'Juntos hacia el resto de nuestras vidas...';

  // Date
  if (fecha) {
    const d = DateUtils.countdown(fecha);
    const formatted = DateUtils.formatDate(fecha);
    const parts = formatted.split(' ');
    el('lp-date').innerHTML = `
      <div class="lp-date-day">${parts[0]}</div>
      <div class="lp-date-rest">${parts.slice(2).join(' ')}</div>
    `;
  }

  // Locations
  el('lp-ceremonia').querySelector('.lp-location-name').textContent =
    lugarCeremonia || 'Por definir';
  el('lp-recepcion').querySelector('.lp-location-name').textContent =
    lugarRecepcion || 'Por definir';

  // Apply selected color to preview
  const screen = document.getElementById('preview-screen');
  if (screen) {
    screen.style.setProperty('--dorado', selectedColor);
  }
}

const getVal = (id) => {
  const el = document.getElementById(`field-${id}`);
  return el ? el.value.trim() : '';
};

const el = (id) => document.getElementById(id) || { textContent: '', innerHTML: '' };

/* ── DEVICE TOGGLE ───────────────────────── */
window.setDevice = (device, btn) => {
  document.querySelectorAll('.preview-device-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const phone = document.getElementById('preview-phone');
  if (device === 'desktop') {
    phone.classList.add('desktop');
  } else {
    phone.classList.remove('desktop');
  }
};

/* ── TEMPLATE SELECTION ──────────────────── */
window.selectTemplate = (id, cardEl) => {
  selectedTemplate = id;
  currentData.template = id;
  document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
  if (cardEl) cardEl.classList.add('selected');
  triggerAutosave();
};

/* ── MUSIC SELECTION ─────────────────────── */
window.selectMusic = (id, itemEl) => {
  selectedMusic = id;
  currentData.musica = id;
  document.querySelectorAll('.music-item').forEach(i => i.classList.remove('selected'));
  if (itemEl) {
    itemEl.classList.add('selected');
    itemEl.querySelector('.music-item__play').textContent = '⏸';
  }
  triggerAutosave();
};

/* ── COLOR SELECTION ─────────────────────── */
window.selectColor = (color, swatchEl) => {
  selectedColor = color;
  currentData.color = color;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  if (swatchEl) swatchEl.classList.add('active');

  // Update custom color inputs
  const customColor = document.getElementById('custom-color');
  const customHex   = document.getElementById('custom-color-hex');
  if (customColor) customColor.value = color;
  if (customHex)   customHex.value   = color;

  updatePreview();
  triggerAutosave();
};

window.applyCustomColor = () => {
  const hex = document.getElementById('custom-color-hex').value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    selectColor(hex, null);
  } else {
    Toast.error('Ingresa un color hexadecimal válido (#RRGGBB)');
  }
};

document.addEventListener('input', (e) => {
  if (e.target.id === 'custom-color') {
    const hex = e.target.value;
    document.getElementById('custom-color-hex').value = hex;
    selectColor(hex, null);
  }
});

/* ── FONT SELECTION ──────────────────────── */
window.selectFont = (el) => {
  selectedFont = el.dataset.font;
  currentData.font = selectedFont;
  document.querySelectorAll('.font-option').forEach(f => f.classList.remove('active'));
  el.classList.add('active');
  triggerAutosave();
};

/* ── PEOPLE ROWS ─────────────────────────── */
window.addPersonRow = (containerId, cls1, cls2) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'person-row';
  row.innerHTML = `
    <div class="form-group">
      <label class="form-label">Nombre del padre</label>
      <input type="text" class="form-input ${cls1}" placeholder="Nombre completo">
    </div>
    <div class="form-group">
      <label class="form-label">Nombre de la madre</label>
      <input type="text" class="form-input ${cls2}" placeholder="Nombre completo">
    </div>
    <button class="person-row__remove" onclick="removePersonRow(this)" title="Eliminar">✕</button>
  `;
  container.appendChild(row);
};

window.addPadrinoRow = () => {
  const container = document.getElementById('padrinos-list');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'person-row';
  row.innerHTML = `
    <div class="form-group">
      <label class="form-label">Padrino / Madrina</label>
      <input type="text" class="form-input pad-nombre" placeholder="Juan & María López">
    </div>
    <div class="form-group">
      <label class="form-label">Concepto</label>
      <input type="text" class="form-input pad-concepto" placeholder="Ej: Ramo de novia">
    </div>
    <button class="person-row__remove" onclick="removePersonRow(this)" title="Eliminar">✕</button>
  `;
  container.appendChild(row);
};

window.removePersonRow = (btn) => {
  const row = btn.closest('.person-row');
  const container = row?.parentElement;
  if (container && container.children.length > 1) {
    row.remove();
  } else {
    Toast.info('Debe quedar al menos una fila');
  }
};

/* ── FILE UPLOAD ─────────────────────────── */
function setupFileUpload() {
  // Gallery photos
  const photoInput  = document.getElementById('photo-input');
  const uploadZone  = document.getElementById('upload-zone');
  const preview     = document.getElementById('photos-preview');

  if (photoInput && uploadZone) {
    // Drag & drop
    uploadZone.addEventListener('dragover', e => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      handlePhotoFiles(e.dataTransfer.files, preview);
    });

    photoInput.addEventListener('change', (e) => {
      handlePhotoFiles(e.target.files, preview);
    });
  }

  // Cover photo
  const coverInput = document.getElementById('cover-input');
  if (coverInput) {
    coverInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        currentData.coverPhoto = ev.target.result;
        updatePreview();
        Toast.success('Foto de portada cargada');
      };
      reader.readAsDataURL(file);
    });
  }
}

function handlePhotoFiles(fileList, previewEl) {
  const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));

  if (photos.length + files.length > 10) {
    Toast.error('Máximo 10 fotos permitidas');
    return;
  }

  files.forEach(file => {
    if (file.size > 5 * 1024 * 1024) {
      Toast.error(`${file.name} supera 5MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      photos.push(dataUrl);
      addPhotoThumb(dataUrl, previewEl);
      triggerAutosave();
    };
    reader.readAsDataURL(file);
  });
}

function addPhotoThumb(src, container) {
  if (!container) return;
  const idx = photos.indexOf(src);
  const thumb = document.createElement('div');
  thumb.className = 'photo-thumb';
  thumb.innerHTML = `
    <img src="${src}" alt="Foto">
    <div class="photo-thumb__remove" onclick="removePhoto(${idx}, this)">✕</div>
  `;
  container.appendChild(thumb);
}

window.removePhoto = (idx, btn) => {
  photos.splice(idx, 1);
  btn.closest('.photo-thumb').remove();
  triggerAutosave();
};

/* ── COLLECT FORM DATA ───────────────────── */
function collectData() {
  const data = {
    template:  selectedTemplate,
    color:     selectedColor,
    font:      selectedFont,
    musica:    selectedMusic,
    musicaUrl: getVal('musicaUrl'),

    novia:    getVal('novia'),
    novio:    getVal('novio'),
    frase:    getVal('frase'),
    historia: getVal('historia'),

    fecha:    getVal('fecha'),
    hora:     getVal('hora'),

    lugarCeremonia:     getVal('lugarCeremonia'),
    direccionCeremonia: getVal('direccionCeremonia'),
    horaCeremonia:      getVal('horaCeremonia'),
    mapsCeremonia:      getVal('mapsCeremonia'),

    lugarRecepcion:     getVal('lugarRecepcion'),
    direccionRecepcion: getVal('direccionRecepcion'),
    horaRecepcion:      getVal('horaRecepcion'),
    mapsRecepcion:      getVal('mapsRecepcion'),

    fotos: photos,

    // Padres novia
    padresNovia: Array.from(document.querySelectorAll('#padres-novia .person-row')).map(row => ({
      padre: row.querySelector('.pn-padre')?.value?.trim() || '',
      madre: row.querySelector('.pn-madre')?.value?.trim() || '',
    })).filter(p => p.padre || p.madre),

    // Padres novio
    padresNovio: Array.from(document.querySelectorAll('#padres-novio .person-row')).map(row => ({
      padre: row.querySelector('.pp-padre')?.value?.trim() || '',
      madre: row.querySelector('.pp-madre')?.value?.trim() || '',
    })).filter(p => p.padre || p.madre),

    // Padrinos
    padrinos: Array.from(document.querySelectorAll('#padrinos-list .person-row')).map(row => ({
      nombre:   row.querySelector('.pad-nombre')?.value?.trim() || '',
      concepto: row.querySelector('.pad-concepto')?.value?.trim() || '',
    })).filter(p => p.nombre),

    // Efectos
    efectoParticulas: document.getElementById('efecto-particulas')?.checked,
    efectoPetalos:    document.getElementById('efecto-petalos')?.checked,
    efectoCountdown:  document.getElementById('efecto-countdown')?.checked,
    efectoRsvp:       document.getElementById('efecto-rsvp')?.checked,
  };
  return data;
}

/* ── AUTOSAVE ────────────────────────────── */
function setupAutosave() {
  // Watch all form inputs
  document.querySelectorAll('.pform-panel input, .pform-panel textarea, .pform-panel select')
    .forEach(el => el.addEventListener('input', triggerAutosave));
}

function triggerAutosave() {
  const indicator = document.getElementById('autosave-indicator');
  if (indicator) {
    indicator.className = 'autosave-indicator saving';
    indicator.querySelector('span').textContent = 'Guardando...';
  }

  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    await saveInvitation(false);
    if (indicator) {
      indicator.className = 'autosave-indicator saved';
      indicator.querySelector('span').textContent = 'Guardado ✓';
      setTimeout(() => {
        indicator.className = 'autosave-indicator';
        indicator.querySelector('span').textContent = 'Guardado';
      }, 2000);
    }
  }, 2000);
}

/* ── SAVE INVITATION ─────────────────────── */
async function saveInvitation(showFeedback = true) {
  const data = collectData();

  try {
    if (invitationId) {
      await InvitArteDB.invitations.update(invitationId, data);
    } else {
      const newInv = await InvitArteDB.invitations.create(currentUser.id, data);
      invitationId = newInv.id;
      // Update URL without reload
      window.history.replaceState({}, '', `personalizar.html?id=${invitationId}`);
    }
    if (showFeedback) Toast.success('Invitación guardada correctamente');
  } catch (err) {
    if (showFeedback) Toast.error('Error al guardar');
    console.error(err);
  }
}

/* ── PUBLISH ─────────────────────────────── */
window.publishInvitation = async () => {
  const data = collectData();

  // Validate minimum required fields
  if (!data.novia || !data.novio) {
    Toast.error('Ingresa los nombres de los novios antes de publicar');
    goToStep(1);
    return;
  }
  if (!data.fecha) {
    Toast.error('Ingresa la fecha del evento');
    goToStep(2);
    return;
  }

  const btn = document.getElementById('publish-btn');
  Form.setLoading(btn, true, 'Publicando...');

  try {
    const publishData = { ...data, status: 'activa' };

    if (invitationId) {
      await InvitArteDB.invitations.update(invitationId, publishData);
    } else {
      const newInv = await InvitArteDB.invitations.create(currentUser.id, publishData);
      invitationId = newInv.id;
    }

    Toast.success('¡Invitación publicada! Redirigiendo...');
    setTimeout(() => {
      window.location.href = `dashboard.html`;
    }, 1500);

  } catch (err) {
    Toast.error('Error al publicar');
    Form.setLoading(btn, false);
  }
};
