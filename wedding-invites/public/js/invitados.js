/**
 * INVITARTE — INVITADOS.JS
 * Módulo completo de gestión de invitados.
 * CRUD, importación CSV/Excel, generación QR, exportación, paginación.
 */

let currentUser    = null;
let invitationId   = null;
let invitationData = null;
let allGuests      = [];
let filteredGuests = [];
let pendingCSV     = [];
let editingGuestId = null;
let selectedIds    = new Set();
let currentFilter  = 'all';
let currentSort    = { field: 'nombre', dir: 1 };
let currentPage    = 1;
const PAGE_SIZE    = 20;

// Base URL used for personalized links
const BASE_URL = window.location.origin + '/plantilla.html';

/* ── INIT ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  Loader.show();

  currentUser = await Auth.requireLogin('/login.html');
  if (!currentUser) return;

  // Get invitation ID from URL
  const params = new URLSearchParams(window.location.search);
  invitationId = params.get('inv');

  if (!invitationId) {
    // Redirect to dashboard to pick an invitation
    Toast.error('Selecciona una invitación primero');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
    return;
  }

  // Load invitation metadata
  invitationData = await InvitArteDB.invitations.getById(invitationId);
  if (!invitationData || invitationData.userId !== currentUser.id) {
    Toast.error('Invitación no encontrada');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
    return;
  }

  // Update subtitle
  const subtitle = document.getElementById('inv-subtitle');
  if (subtitle && invitationData.novia && invitationData.novio) {
    subtitle.textContent =
      `${invitationData.novia} & ${invitationData.novio} — ${DateUtils.formatDate(invitationData.fecha) || 'Fecha por definir'}`;
  }

  // Load guests
  await loadGuests();

  // Setup CSV drag & drop
  setupCSVDrop();

  // Modal init
  Modal.init();

  // Link preview listener
  document.getElementById('guest-nombre')?.addEventListener('input', updateLinkPreview);

  Navbar.init();
  Loader.hide();
});

/* ── LOAD GUESTS ─────────────────────────── */
async function loadGuests() {
  allGuests = await InvitArteDB.guests.getAllByInvitation(invitationId);
  applyFilterAndRender();
  renderStats();
}

/* ── STATS ───────────────────────────────── */
function renderStats() {
  const totalPases = allGuests.reduce((s, g) => s + (parseInt(g.pases) || 1), 0);
  const confirmed  = allGuests.filter(g => g.confirmed === true).length;
  const declined   = allGuests.filter(g => g.confirmed === false).length;

  document.getElementById('guests-stats').innerHTML = `
    <div class="gstat">
      <div class="gstat__value">${allGuests.length}</div>
      <div class="gstat__label">Total invitados</div>
    </div>
    <div class="gstat">
      <div class="gstat__value"><em>${totalPases}</em></div>
      <div class="gstat__label">Total pases</div>
    </div>
    <div class="gstat">
      <div class="gstat__value" style="color:var(--verde-ok)">${confirmed}</div>
      <div class="gstat__label">Confirmados</div>
    </div>
    <div class="gstat">
      <div class="gstat__value" style="color:var(--gris-texto)">${allGuests.length - confirmed - declined}</div>
      <div class="gstat__label">Sin confirmar</div>
    </div>
  `;
}

/* ── FILTER & SORT ───────────────────────── */
window.setFilter = (filter, btn) => {
  currentFilter = filter;
  currentPage   = 1;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  applyFilterAndRender();
};

window.sortGuests = (field) => {
  if (currentSort.field === field) {
    currentSort.dir *= -1;
  } else {
    currentSort = { field, dir: 1 };
  }
  applyFilterAndRender();
};

window.filterGuests = () => {
  currentPage = 1;
  applyFilterAndRender();
};

function applyFilterAndRender() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase().trim();

  filteredGuests = allGuests.filter(g => {
    const matchSearch = !search || g.nombre.toLowerCase().includes(search) ||
                        (g.mesa || '').toLowerCase().includes(search);
    const matchFilter =
      currentFilter === 'all'       ? true :
      currentFilter === 'confirmed' ? g.confirmed === true :
      currentFilter === 'pending'   ? g.confirmed === null || g.confirmed === undefined :
      true;
    return matchSearch && matchFilter;
  });

  // Sort
  filteredGuests.sort((a, b) => {
    const aVal = (a[currentSort.field] || '').toString().toLowerCase();
    const bVal = (b[currentSort.field] || '').toString().toLowerCase();
    return aVal.localeCompare(bVal) * currentSort.dir;
  });

  renderTable();
  renderPagination();
}

/* ── RENDER TABLE ────────────────────────── */
function renderTable() {
  const tbody   = document.getElementById('guests-tbody');
  const empty   = document.getElementById('guests-empty');
  const footer  = document.getElementById('table-footer');
  const info    = document.getElementById('table-info');
  if (!tbody) return;

  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filteredGuests.slice(start, start + PAGE_SIZE);

  if (filteredGuests.length === 0) {
    tbody.innerHTML = '';
    empty.style.display  = 'block';
    footer.style.display = 'none';
    return;
  }

  empty.style.display  = 'none';
  footer.style.display = 'flex';
  info.textContent     = `${filteredGuests.length} invitado${filteredGuests.length !== 1 ? 's' : ''}`;

  tbody.innerHTML = page.map(g => {
    const link    = guestLink(g);
    const initials = g.nombre.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
    const checked  = selectedIds.has(g.id) ? 'checked' : '';
    const confBadge = g.confirmed === true
      ? '<span class="badge badge--green">✓ Confirmado</span>'
      : g.confirmed === false
        ? '<span class="badge badge--red">✗ No va</span>'
        : '<span class="badge badge--gray">Sin confirmar</span>';

    return `
      <tr data-id="${g.id}">
        <td>
          <input type="checkbox" ${checked}
            style="accent-color:var(--dorado);cursor:pointer"
            onchange="toggleSelect('${g.id}', this)">
        </td>
        <td>
          <div class="guest-name-cell">
            <div class="guest-avatar">${initials}</div>
            <div>
              <div class="guest-name">${escHtml(g.nombre)}</div>
              <div class="guest-meta">${confBadge}</div>
            </div>
          </div>
        </td>
        <td class="hide-mobile">
          <span class="pases-badge">🎫 ${g.pases || 1}</span>
        </td>
        <td class="hide-mobile">
          ${g.mesa ? `<span style="font-size:0.8rem;color:var(--gris-texto)">${escHtml(g.mesa)}</span>` : '<span style="color:rgba(255,255,255,0.15)">—</span>'}
        </td>
        <td class="hide-mobile">
          <div class="link-cell">
            <span class="link-text" title="${link}">${link}</span>
            <button class="table-action-btn" title="Copiar link"
              onclick="copyGuestLink('${encodeURIComponent(g.nombre)}')">📋</button>
          </div>
        </td>
        <td class="hide-mobile">
          <button class="table-action-btn" title="Ver QR"
            onclick="showQR('${g.id}')">QR</button>
        </td>
        <td>
          <div class="table-actions">
            <button class="table-action-btn" title="Editar" onclick="editGuest('${g.id}')">✏</button>
            <button class="table-action-btn delete" title="Eliminar" onclick="deleteGuest('${g.id}')">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ── PAGINATION ──────────────────────────── */
function renderPagination() {
  const total = Math.ceil(filteredGuests.length / PAGE_SIZE);
  const pg = document.getElementById('pagination');
  if (!pg) return;

  if (total <= 1) { pg.innerHTML = ''; return; }

  let html = '';
  for (let i = 1; i <= total; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}"
      onclick="goToPage(${i})">${i}</button>`;
  }
  pg.innerHTML = html;
}

window.goToPage = (n) => {
  currentPage = n;
  renderTable();
  renderPagination();
};

/* ── ADD / EDIT GUEST ────────────────────── */
window.openAddGuestModal = () => {
  editingGuestId = null;
  document.getElementById('modal-guest-title').textContent = 'Agregar invitado';
  document.getElementById('guest-nombre').value = '';
  document.getElementById('guest-pases').value  = '1';
  document.getElementById('guest-mesa').value   = '';
  updateLinkPreview();
  Modal.open('modal-guest');
  setTimeout(() => document.getElementById('guest-nombre').focus(), 100);
};

window.editGuest = (id) => {
  const guest = allGuests.find(g => g.id === id);
  if (!guest) return;
  editingGuestId = id;
  document.getElementById('modal-guest-title').textContent = 'Editar invitado';
  document.getElementById('guest-nombre').value = guest.nombre;
  document.getElementById('guest-pases').value  = guest.pases || 1;
  document.getElementById('guest-mesa').value   = guest.mesa || '';
  updateLinkPreview();
  Modal.open('modal-guest');
};

function updateLinkPreview() {
  const nombre = document.getElementById('guest-nombre')?.value?.trim() || '';
  const preview = document.getElementById('link-preview');
  if (preview) {
    preview.textContent = nombre
      ? `${BASE_URL}?invitado=${encodeURIComponent(nombre)}&inv=${invitationId}`
      : 'plantilla.html?invitado=...';
  }
}

window.saveGuest = async () => {
  const nombre = document.getElementById('guest-nombre')?.value?.trim();
  const pases  = document.getElementById('guest-pases')?.value;
  const mesa   = document.getElementById('guest-mesa')?.value?.trim();

  if (!nombre) {
    Form.showError(document.getElementById('guest-nombre'), 'El nombre es requerido');
    return;
  }

  const btn = document.getElementById('save-guest-btn');
  Form.setLoading(btn, true, 'Guardando...');

  try {
    if (editingGuestId) {
      await InvitArteDB.guests.update(editingGuestId, { nombre, pases, mesa });
      Toast.success('Invitado actualizado');
    } else {
      await InvitArteDB.guests.create(invitationId, { nombre, pases, mesa });
      Toast.success('Invitado agregado');
    }
    await loadGuests();
    Modal.close('modal-guest');
  } catch (err) {
    Toast.error(err.message || 'Error al guardar');
  } finally {
    Form.setLoading(btn, false);
  }
};

/* ── DELETE GUEST ────────────────────────── */
window.deleteGuest = async (id) => {
  const guest = allGuests.find(g => g.id === id);
  if (!guest) return;
  if (!confirm(`¿Eliminar a "${guest.nombre}" de la lista?`)) return;

  try {
    await InvitArteDB.guests.delete(id);
    allGuests = allGuests.filter(g => g.id !== id);
    applyFilterAndRender();
    renderStats();
    Toast.success('Invitado eliminado');
  } catch (err) {
    Toast.error('Error al eliminar');
  }
};

/* ── SELECT ALL ──────────────────────────── */
window.selectAll = () => {
  const allChecked = filteredGuests.every(g => selectedIds.has(g.id));
  if (allChecked) {
    filteredGuests.forEach(g => selectedIds.delete(g.id));
  } else {
    filteredGuests.forEach(g => selectedIds.add(g.id));
  }
  renderTable();
  updateBulkBtn();
};

window.toggleSelectAll = (cb) => {
  if (cb.checked) {
    filteredGuests.forEach(g => selectedIds.add(g.id));
  } else {
    selectedIds.clear();
  }
  renderTable();
  updateBulkBtn();
};

window.toggleSelect = (id, cb) => {
  if (cb.checked) {
    selectedIds.add(id);
  } else {
    selectedIds.delete(id);
  }
  updateBulkBtn();
};

function updateBulkBtn() {
  const btn = document.getElementById('bulk-delete-btn');
  if (btn) btn.style.display = selectedIds.size > 0 ? 'inline-flex' : 'none';
}

window.bulkDelete = async () => {
  if (!selectedIds.size) return;
  if (!confirm(`¿Eliminar ${selectedIds.size} invitado(s)?`)) return;

  for (const id of selectedIds) {
    await InvitArteDB.guests.delete(id);
  }
  selectedIds.clear();
  await loadGuests();
  updateBulkBtn();
  Toast.success('Invitados eliminados');
};

/* ── QR MODAL ────────────────────────────── */
window.showQR = (id) => {
  const guest = allGuests.find(g => g.id === id);
  if (!guest) return;

  const link = guestLink(guest);
  document.getElementById('qr-guest-name').textContent = guest.nombre;
  document.getElementById('qr-guest-img').src = QRGen.generate(link, 400);

  document.getElementById('download-qr-btn').onclick = () => {
    QRGen.downloadQR(link, `qr-${guest.nombre.replace(/\s+/g,'-')}`);
  };

  document.getElementById('whatsapp-qr-btn').onclick = () => {
    Share.whatsapp(link, guest.nombre);
  };

  Modal.open('modal-qr');
};

/* ── COPY LINK ───────────────────────────── */
window.copyGuestLink = (encodedName) => {
  const url = `${BASE_URL}?invitado=${encodedName}&inv=${invitationId}`;
  Share.copyLink(url);
};

function guestLink(guest) {
  return `${BASE_URL}?invitado=${encodeURIComponent(guest.nombre)}&inv=${invitationId}`;
}

/* ── IMPORT PANEL ────────────────────────── */
window.toggleImportPanel = () => {
  const panel = document.getElementById('import-panel');
  if (panel) panel.classList.toggle('open');
};

window.showImportTab = (tab) => {
  ['csv','excel','sheets'].forEach(t => {
    const el = document.getElementById(`import-tab-${t}`);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
};

/* ── CSV SETUP ───────────────────────────── */
function setupCSVDrop() {
  const zone  = document.getElementById('import-tab-csv');
  const input = document.getElementById('csv-file-input');

  if (!zone || !input) return;

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processCSVFile(file);
  });

  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) processCSVFile(file);
  });
}

async function processCSVFile(file) {
  if (!file.name.match(/\.(csv|txt)$/i)) {
    Toast.error('Solo se aceptan archivos .csv');
    return;
  }

  try {
    const text = await FileParser.readFile(file);
    const parsed = FileParser.parseCSV(text);

    if (!parsed.length) {
      Toast.error('No se encontraron datos válidos en el archivo');
      return;
    }

    pendingCSV = parsed;
    showCSVPreview(parsed);
  } catch (err) {
    Toast.error('Error al leer el archivo');
  }
}

function showCSVPreview(data) {
  document.getElementById('csv-count').textContent = data.length;
  const tbody = document.getElementById('csv-preview-body');
  if (tbody) {
    tbody.innerHTML = data.slice(0, 20).map(g => `
      <tr>
        <td>${escHtml(g.nombre)}</td>
        <td>${g.pases}</td>
        <td>${g.mesa || '—'}</td>
      </tr>
    `).join('');
    if (data.length > 20) {
      tbody.innerHTML += `<tr><td colspan="3" style="color:var(--gris-texto);text-align:center">
        ... y ${data.length - 20} más
      </td></tr>`;
    }
  }
  Modal.open('modal-csv-preview');
}

window.confirmImport = async () => {
  if (!pendingCSV.length) return;
  const btn = document.getElementById('confirm-import-btn');
  Form.setLoading(btn, true, 'Importando...');

  try {
    await InvitArteDB.guests.bulkCreate(invitationId, pendingCSV);
    await loadGuests();
    Modal.close('modal-csv-preview');
    toggleImportPanel();
    Toast.success(`${pendingCSV.length} invitados importados correctamente`);
    pendingCSV = [];
  } catch (err) {
    Toast.error('Error al importar invitados');
  } finally {
    Form.setLoading(btn, false);
  }
};

/* ── EXCEL UPLOAD (simulated via CSV) ────── */
window.handleExcelUpload = (input) => {
  const file = input.files[0];
  if (!file) return;
  Toast.info('Procesando archivo Excel...');
  // In production: use SheetJS library
  // For now, guide user to save as CSV
  setTimeout(() => {
    Toast.error('Por favor exporta tu Excel como CSV (.csv) e importa ese archivo');
  }, 1000);
};

/* ── GOOGLE SHEETS IMPORT ────────────────── */
window.importFromSheets = async () => {
  const url = document.getElementById('sheets-url')?.value?.trim();
  if (!url || !url.includes('google.com/spreadsheets')) {
    Toast.error('Ingresa una URL válida de Google Sheets');
    return;
  }

  // Convert to CSV export URL
  let csvUrl = url;
  if (url.includes('/edit')) {
    csvUrl = url.replace(/\/edit.*$/, '/export?format=csv');
  }

  Toast.info('Conectando con Google Sheets...');

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('No se pudo acceder al archivo');
    const text = await response.text();
    const parsed = FileParser.parseCSV(text);

    if (!parsed.length) throw new Error('No se encontraron datos');

    pendingCSV = parsed;
    showCSVPreview(parsed);
  } catch (err) {
    Toast.error('Error: Verifica que el archivo sea público y tenga el formato correcto');
  }
};

/* ── EXPORT CSV ──────────────────────────── */
window.exportGuests = () => {
  if (!allGuests.length) {
    Toast.info('No hay invitados para exportar');
    return;
  }

  const headers = 'Nombre,Pases,Mesa,Confirmación,Link personalizado\n';
  const rows = allGuests.map(g => {
    const conf = g.confirmed === true ? 'Confirmado' : g.confirmed === false ? 'No va' : 'Pendiente';
    const link = guestLink(g);
    return `"${g.nombre}",${g.pases || 1},"${g.mesa || ''}","${conf}","${link}"`;
  }).join('\n');

  const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `invitados-${invitationId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  Toast.success('Lista exportada correctamente');
};

/* ── DOWNLOAD CSV TEMPLATE ───────────────── */
window.downloadCSVTemplate = (e) => {
  if (e) e.preventDefault();
  const template = 'nombre,pases,mesa\nJuan Pérez,2,Mesa 1\nMaría García,1,Mesa 3\nCarlos López,4,Mesa 5\n';
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'plantilla-invitados.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  Toast.success('Plantilla descargada');
};

/* ── HELPERS ─────────────────────────────── */
const escHtml = (str) => String(str)
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;');
