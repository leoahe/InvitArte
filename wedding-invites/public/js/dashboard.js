/**
 * INVITARTE — DASHBOARD.JS
 * Lógica del panel de control del usuario.
 */

let currentUser = null;
let userInvitations = [];
let invToDelete = null;
let invToShare = null;

document.addEventListener('DOMContentLoaded', async () => {
  Loader.show();

  // Auth guard
  currentUser = await Auth.requireLogin('/login.html');
  if (!currentUser) return;

  // Init UI
  initSidebar();
  initMobileMenu();
  await loadDashboard();
  Modal.init();

  Loader.hide();
});

/* ── LOAD DASHBOARD DATA ─────────────────── */
async function loadDashboard() {
  // Update user info in sidebar
  document.getElementById('user-name').textContent  = currentUser.nombre;
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent =
    currentUser.nombre.charAt(0).toUpperCase();

  // Plan badge
  const planNames = { free:'Básico', basico:'Básico', premium:'Premium', ultra:'Ultra Premium' };
  document.getElementById('sidebar-plan').textContent =
    '✦ Plan ' + (planNames[currentUser.plan] || 'Básico');

  // Load invitations
  userInvitations = await InvitArteDB.invitations.getAllByUser(currentUser.id);
  document.getElementById('inv-count-badge').textContent = userInvitations.length;

  // Render overview
  renderStats();
  renderRecentInvitations();
  renderAllInvitations();
  renderGuestSelector();
  renderPlanSection();
  renderProfileForm();

  // Show upgrade banner for free plan
  if (!currentUser.plan || currentUser.plan === 'free') {
    document.getElementById('upgrade-banner').style.display = 'flex';
  }
}

/* ── STATS ───────────────────────────────── */
async function renderStats() {
  const grid = document.getElementById('stats-grid');
  if (!grid) return;

  // Count total guests
  let totalGuests = 0;
  for (const inv of userInvitations) {
    const guests = await InvitArteDB.guests.getAllByInvitation(inv.id);
    totalGuests += guests.length;
  }

  const totalViews = userInvitations.reduce((s, i) => s + (i.views || 0), 0);
  const activeCount = userInvitations.filter(i => i.status === 'activa').length;

  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__label">Invitaciones</div>
      <div class="stat-card__value">${userInvitations.length}</div>
      <div class="stat-card__sub">${activeCount} activa${activeCount !== 1 ? 's' : ''}</div>
      <span class="stat-card__icon">✉</span>
    </div>
    <div class="stat-card">
      <div class="stat-card__label">Total Invitados</div>
      <div class="stat-card__value">${totalGuests}</div>
      <div class="stat-card__sub">en todas las invitaciones</div>
      <span class="stat-card__icon">👥</span>
    </div>
    <div class="stat-card">
      <div class="stat-card__label">Vistas totales</div>
      <div class="stat-card__value">${totalViews}</div>
      <div class="stat-card__sub">en todos los enlaces</div>
      <span class="stat-card__icon">👁</span>
    </div>
    <div class="stat-card">
      <div class="stat-card__label">Plan actual</div>
      <div class="stat-card__value" style="font-size:1.4rem;text-transform:capitalize">
        <em>${currentUser.plan || 'Básico'}</em>
      </div>
      <div class="stat-card__sub"><a href="#" onclick="showSection('pagos')" style="color:var(--dorado)">Mejorar plan →</a></div>
      <span class="stat-card__icon">✦</span>
    </div>
  `;
}

/* ── INVITATION CARD HTML ────────────────── */
function invitationCardHTML(inv, showActions = true) {
  const statusMap = {
    borrador: { label: 'Borrador', cls: 'badge--gray' },
    activa:   { label: 'Activa',   cls: 'badge--green' },
    pausada:  { label: 'Pausada',  cls: 'badge--red' },
  };
  const st = statusMap[inv.status] || statusMap.borrador;
  const fecha = DateUtils.formatDate(inv.fecha) || 'Sin fecha';

  const names = (inv.novio && inv.novia)
    ? `<div class="inv-card__preview-names">${inv.novia.split(' ')[0]}</div>
       <span class="inv-card__preview-amp">&amp;</span>
       <div class="inv-card__preview-names">${inv.novio.split(' ')[0]}</div>`
    : `<div class="inv-card__preview-names" style="font-size:1.4rem">${inv.nombre || 'Mi Evento'}</div>`;

  return `
    <div class="inv-card" onclick="openInvitation('${inv.id}')">
      <div class="inv-card__preview">
        <div class="inv-card__preview-bg"></div>
        <div class="inv-card__preview-text">${names}</div>
        <div class="inv-card__status">
          <span class="badge ${st.cls}">${st.label}</span>
        </div>
      </div>
      <div class="inv-card__body">
        <div class="inv-card__title">
          ${inv.novia && inv.novio ? `${inv.novia.split(' ')[0]} & ${inv.novio.split(' ')[0]}` : (inv.nombre || 'Mi Evento')}
        </div>
        <div class="inv-card__meta">
          <span class="inv-card__meta-item">📅 ${fecha}</span>
          <span class="inv-card__meta-item">👁 ${inv.views || 0} vistas</span>
        </div>
      </div>
      ${showActions ? `
      <div class="inv-card__actions" onclick="event.stopPropagation()">
        <a href="personalizar.html?id=${inv.id}" class="btn btn--sm btn--outline">✏ Editar</a>
        <button class="btn btn--sm btn--ghost" onclick="shareInvitation('${inv.id}')">🔗 Compartir</button>
        <button class="btn btn--sm btn--danger" onclick="deleteInvitation('${inv.id}')">✕</button>
      </div>` : ''}
    </div>
  `;
}

/* ── RECENT INVITATIONS ──────────────────── */
function renderRecentInvitations() {
  const el = document.getElementById('recent-invitations-list');
  if (!el) return;

  const recent = [...userInvitations]
    .sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3);

  if (recent.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state__icon">✉</div>
        <div class="empty-state__title">Aún no tienes invitaciones</div>
        <div class="empty-state__subtitle">Crea tu primera invitación digital en minutos.</div>
        <a href="personalizar.html" class="btn btn--primary">Crear mi primera invitación</a>
      </div>
    `;
    return;
  }

  el.innerHTML = recent.map(inv => invitationCardHTML(inv)).join('');
}

/* ── ALL INVITATIONS ─────────────────────── */
function renderAllInvitations() {
  const el = document.getElementById('all-invitations-list');
  if (!el) return;

  if (userInvitations.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state__icon">✉</div>
        <div class="empty-state__title">Sin invitaciones aún</div>
        <div class="empty-state__subtitle">Crea tu primera invitación y sorprende a tus invitados.</div>
        <a href="personalizar.html" class="btn btn--primary mt-lg">Crear invitación</a>
      </div>
    `;
    return;
  }

  el.innerHTML = userInvitations.map(inv => invitationCardHTML(inv)).join('');
}

/* ── GUEST SELECTOR ──────────────────────── */
function renderGuestSelector() {
  const sel = document.getElementById('guest-inv-select');
  if (!sel) return;

  userInvitations.forEach(inv => {
    const opt = document.createElement('option');
    opt.value = inv.id;
    opt.textContent = inv.novia && inv.novio
      ? `${inv.novia} & ${inv.novio}`
      : (inv.nombre || 'Invitación');
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    const val = sel.value;
    document.getElementById('guests-module').style.display    = val ? 'block' : 'none';
    document.getElementById('guests-no-selection').style.display = val ? 'none' : 'block';
    if (val) {
      document.querySelector('#guests-module a').href = `invitados.html?inv=${val}`;
    }
  });
}

/* ── PLAN SECTION ────────────────────────── */
function renderPlanSection() {
  const currentPlanCard = document.getElementById('current-plan-card');
  const plansGrid       = document.getElementById('plans-grid');
  if (!currentPlanCard || !plansGrid) return;

  const planId = currentUser.plan || 'free';
  const planData = PLANS[planId === 'free' ? 'basico' : planId] || PLANS.basico;

  currentPlanCard.innerHTML = `
    <div style="
      background:linear-gradient(135deg,rgba(201,168,76,0.08),rgba(201,168,76,0.02));
      border:1px solid var(--dorado-borde);
      border-radius:var(--r-xl);
      padding:var(--sp-xl);
      display:flex;align-items:center;justify-content:space-between;gap:var(--sp-xl);
    ">
      <div>
        <div style="font-size:0.65rem;letter-spacing:0.2em;color:var(--dorado);text-transform:uppercase;margin-bottom:var(--sp-sm)">
          Tu plan actual
        </div>
        <div style="font-family:var(--font-display);font-size:2rem;font-weight:300;color:var(--blanco)">
          ${planData.nombre}
        </div>
        <div style="font-size:0.82rem;color:var(--gris-texto);margin-top:var(--sp-sm)">
          Hasta ${planData.invitadosIncluidos} invitados incluidos
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--font-display);font-size:2.5rem;color:var(--dorado);font-weight:300">
          $${planData.precio.toLocaleString()}
          <span style="font-size:1rem;color:var(--gris-texto)"> MXN</span>
        </div>
      </div>
    </div>
  `;

  plansGrid.innerHTML = Object.values(PLANS).map(plan => `
    <div class="card" style="padding:var(--sp-xl);${plan.destacado ? 'border-color:var(--dorado-borde);' : ''}${currentUser.plan === plan.id ? 'opacity:0.5;pointer-events:none' : ''}">
      ${plan.destacado ? '<div class="badge badge--gold" style="margin-bottom:var(--sp-md)">✦ Popular</div>' : ''}
      <div style="font-family:var(--font-display);font-size:1.3rem;margin-bottom:var(--sp-sm)">${plan.nombre}</div>
      <div style="font-family:var(--font-display);font-size:2rem;color:var(--dorado)">
        $${plan.precio.toLocaleString()}
        <span style="font-size:0.8rem;color:var(--gris-texto)">MXN</span>
      </div>
      <div style="font-size:0.75rem;color:var(--gris-texto);margin:var(--sp-md) 0 var(--sp-lg)">
        ${plan.invitadosIncluidos} invitados incluidos
      </div>
      <ul style="display:flex;flex-direction:column;gap:var(--sp-sm);margin-bottom:var(--sp-xl)">
        ${plan.caracteristicas.map(c => `
          <li style="display:flex;gap:var(--sp-sm);font-size:0.78rem;color:var(--gris-texto)">
            <span style="color:var(--dorado)">✓</span>${c}
          </li>`).join('')}
      </ul>
      ${currentUser.plan === plan.id
        ? '<div class="btn btn--ghost btn--full" style="opacity:0.5">Plan actual</div>'
        : `<a href="checkout.html?plan=${plan.id}" class="btn btn--${plan.destacado ? 'primary' : 'outline'} btn--full">
            Seleccionar →
           </a>`
      }
    </div>
  `).join('');
}

/* ── PROFILE FORM ────────────────────────── */
function renderProfileForm() {
  if (document.getElementById('profile-nombre')) {
    document.getElementById('profile-nombre').value  = currentUser.nombre || '';
    document.getElementById('profile-email').value   = currentUser.email || '';
    document.getElementById('profile-telefono').value = currentUser.telefono || '';
  }

  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre   = document.getElementById('profile-nombre').value.trim();
      const email    = document.getElementById('profile-email').value.trim();
      const telefono = document.getElementById('profile-telefono').value.trim();

      try {
        await InvitArteDB.users.update(currentUser.id, { nombre, email, telefono });
        currentUser = await InvitArteDB.users.getCurrentUser();
        Toast.success('Perfil actualizado correctamente');
        document.getElementById('user-name').textContent = nombre;
        document.getElementById('user-avatar').textContent = nombre.charAt(0).toUpperCase();
      } catch (err) {
        Toast.error(err.message || 'Error al actualizar perfil');
      }
    });
  }
}

/* ── NAVIGATION ──────────────────────────── */
window.showSection = (name) => {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('active'));

  const section = document.getElementById(`section-${name}`);
  if (section) section.classList.add('active');

  const link = document.querySelector(`[data-section="${name}"]`);
  if (link) link.classList.add('active');

  document.getElementById('topbar-title').textContent = {
    overview:      'Resumen',
    invitaciones:  'Mis Invitaciones',
    invitados:     'Invitados',
    pagos:         'Plan & Pagos',
    perfil:        'Mi Perfil',
  }[name] || '';

  // Close mobile menu
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
};

/* ── OPEN INVITATION ─────────────────────── */
window.openInvitation = (id) => {
  window.location.href = `personalizar.html?id=${id}`;
};

/* ── DELETE INVITATION ───────────────────── */
window.deleteInvitation = (id) => {
  invToDelete = id;
  Modal.open('modal-delete-inv');
};

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
  if (!invToDelete) return;
  try {
    await InvitArteDB.invitations.delete(invToDelete);
    await InvitArteDB.guests.deleteAllByInvitation(invToDelete);
    userInvitations = userInvitations.filter(i => i.id !== invToDelete);
    document.getElementById('inv-count-badge').textContent = userInvitations.length;
    renderRecentInvitations();
    renderAllInvitations();
    renderStats();
    Modal.close('modal-delete-inv');
    Toast.success('Invitación eliminada');
    invToDelete = null;
  } catch (err) {
    Toast.error('Error al eliminar');
  }
});

/* ── SHARE INVITATION ────────────────────── */
window.shareInvitation = (id) => {
  const inv = userInvitations.find(i => i.id === id);
  if (!inv) return;
  invToShare = inv;

  const url = `${window.location.origin}/plantilla.html?inv=${inv.slug || inv.id}`;
  document.getElementById('share-url').textContent = url;
  document.getElementById('qr-img').src = QRGen.generate(url, 300);

  document.getElementById('share-whatsapp-btn').onclick = () => {
    const name = inv.novia && inv.novio ? `${inv.novia} & ${inv.novio}` : 'mi evento';
    Share.whatsapp(url, name);
  };

  Modal.open('modal-share');
};

window.copyShareUrl = () => {
  const url = document.getElementById('share-url').textContent;
  Share.copyLink(url);
};

window.downloadQR = () => {
  if (!invToShare) return;
  QRGen.downloadQR(
    `${window.location.origin}/plantilla.html?inv=${invToShare.slug || invToShare.id}`,
    `qr-${invToShare.slug || invToShare.id}`
  );
};

/* ── LOGOUT ──────────────────────────────── */
window.confirmLogout = () => {
  if (confirm('¿Deseas cerrar sesión?')) Auth.logout();
};

/* ── DELETE ACCOUNT ──────────────────────── */
window.confirmDeleteAccount = () => {
  const confirmed = prompt('Escribe ELIMINAR para confirmar:');
  if (confirmed === 'ELIMINAR') {
    Toast.info('Cuenta eliminada. Redirigiendo...');
    setTimeout(async () => {
      await Auth.logout();
    }, 1500);
  }
};

/* ── SIDEBAR INIT ────────────────────────── */
function initSidebar() {
  // Make onclick work on sidebar links
  document.querySelectorAll('.sidebar__link[data-section]').forEach(link => {
    link.addEventListener('click', () => {
      const section = link.dataset.section;
      if (section) showSection(section);
    });
  });
}

/* ── MOBILE MENU ─────────────────────────── */
function initMobileMenu() {
  const toggle   = document.getElementById('menu-toggle');
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');

  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }
}
