/**
 * INVITARTE — ADMIN.JS
 * Panel administrador: estadísticas, usuarios, invitaciones, ventas.
 * Protegido: solo accesible desde cuentas admin.
 */

const ADMIN_EMAILS = ['admin@invitarte.mx', 'demo@invitarte.mx'];

let allUsers      = [];
let allInvitations= [];
let allOrders     = [];
let stats         = {};
let usersFiltered = [];

/* ── INIT ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  Loader.show();

  const user = await Auth.requireLogin('/login.html');
  if (!user) return;

  // Admin gate
  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    Toast.error('Acceso denegado: no tienes permisos de administrador');
    setTimeout(() => window.location.href = 'dashboard.html', 2000);
    return;
  }

  // Update datetime
  updateClock();
  setInterval(updateClock, 60000);

  // Load all data
  await loadAllData();

  // Init mobile burger
  initMobileAdmin();

  Loader.hide();
});

function updateClock() {
  const el = document.getElementById('admin-datetime');
  if (el) {
    el.textContent = new Date().toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}

/* ── LOAD ALL DATA ───────────────────────── */
async function loadAllData() {
  // Get raw data from storage
  allUsers       = InvitArteDB.users ? (await InvitArteDB.admin.getStats()).recentUsers : [];
  stats          = await InvitArteDB.admin.getStats();

  // Full lists (access internal storage directly for admin)
  const usersRaw = JSON.parse(localStorage.getItem('ia_users') || '[]');
  allUsers       = usersRaw.map(u => ({ ...u, passwordHash: undefined }));

  const invRaw   = JSON.parse(localStorage.getItem('ia_invitations') || '[]');
  allInvitations = invRaw;

  const ordersRaw = JSON.parse(localStorage.getItem('ia_orders') || '[]');
  allOrders       = ordersRaw;

  // Render everything
  renderKPIs();
  renderRevenueChart();
  renderDonutChart();
  renderRecentUsers();
  renderAllUsers();
  renderAllInvitations();
  renderVentas();
}

/* ── KPIs ────────────────────────────────── */
function renderKPIs() {
  const grid = document.getElementById('kpi-grid');
  if (!grid) return;

  const totalRevenue = allOrders
    .filter(o => o.status === 'completed')
    .reduce((s, o) => s + (o.total || 0), 0);

  const activeInvs  = allInvitations.filter(i => i.status === 'activa').length;
  const thisMonth   = allUsers.filter(u => {
    const d = new Date(u.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  grid.innerHTML = `
    <div class="kpi-card kpi-card--gold">
      <div class="kpi-label">Ingresos totales</div>
      <div class="kpi-value"><em>$${totalRevenue.toLocaleString()}</em></div>
      <div class="kpi-change up">↑ MXN</div>
      <span class="kpi-icon">💰</span>
    </div>
    <div class="kpi-card kpi-card--green">
      <div class="kpi-label">Usuarios registrados</div>
      <div class="kpi-value"><em>${allUsers.length}</em></div>
      <div class="kpi-change up">↑ ${thisMonth} este mes</div>
      <span class="kpi-icon">👥</span>
    </div>
    <div class="kpi-card kpi-card--blue">
      <div class="kpi-label">Invitaciones activas</div>
      <div class="kpi-value"><em>${activeInvs}</em></div>
      <div class="kpi-change flat">de ${allInvitations.length} totales</div>
      <span class="kpi-icon">✉</span>
    </div>
    <div class="kpi-card kpi-card--red">
      <div class="kpi-label">Órdenes completadas</div>
      <div class="kpi-value"><em>${allOrders.filter(o=>o.status==='completed').length}</em></div>
      <div class="kpi-change flat">de ${allOrders.length} totales</div>
      <span class="kpi-icon">🛒</span>
    </div>
  `;
}

/* ── REVENUE BAR CHART ───────────────────── */
function renderRevenueChart() {
  const container = document.getElementById('revenue-chart');
  if (!container) return;

  // Generate simulated monthly data (last 6 months)
  const months   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const now      = new Date();
  const data     = [];

  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = months[d.getMonth()];

    // Sum real orders for this month
    const monthRevenue = allOrders
      .filter(o => {
        const od = new Date(o.createdAt);
        return o.status === 'completed' &&
               od.getMonth() === d.getMonth() &&
               od.getFullYear() === d.getFullYear();
      })
      .reduce((s, o) => s + (o.total || 0), 0);

    // Add simulated base if no real data (for demo)
    const simulated = monthRevenue || Math.floor(Math.random() * 15000 + 5000);
    data.push({ label, value: simulated });
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);

  container.innerHTML = `
    <div class="mini-bar-chart">
      ${data.map(d => `
        <div class="mini-bar"
             style="height:${Math.round((d.value / maxVal) * 100)}%"
             title="${d.label}: $${d.value.toLocaleString()}">
          <div class="mini-bar__label">${d.label}</div>
          <div class="mini-bar__tooltip">$${d.value.toLocaleString()}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ── DONUT CHART ─────────────────────────── */
function renderDonutChart() {
  const planCount = {
    free:    allUsers.filter(u => !u.plan || u.plan === 'free').length,
    basico:  allUsers.filter(u => u.plan === 'basico').length,
    premium: allUsers.filter(u => u.plan === 'premium').length,
    ultra:   allUsers.filter(u => u.plan === 'ultra').length,
  };

  const total = allUsers.length || 1;
  const CIRC  = 314; // 2πr ≈ 2*3.14159*50

  document.getElementById('donut-total').textContent = allUsers.length;

  // Colors & data
  const segments = [
    { id: 'donut-basico',  key: 'basico',  color: '#7a9e87', name: 'Básico'       },
    { id: 'donut-premium', key: 'premium', color: '#c9a84c', name: 'Premium'      },
    { id: 'donut-ultra',   key: 'ultra',   color: '#4a9eda', name: 'Ultra Premium'},
  ];

  let offset = 0;
  segments.forEach(seg => {
    const count = planCount[seg.key] + (seg.key === 'basico' ? planCount.free : 0);
    const pct   = count / total;
    const dash  = pct * CIRC;
    const circle = document.getElementById(seg.id);
    if (circle) {
      circle.setAttribute('stroke-dasharray', `${dash} ${CIRC - dash}`);
      circle.setAttribute('stroke-dashoffset', -offset);
    }
    offset += dash;
  });

  // Legend
  const legend = document.getElementById('plan-legend');
  if (legend) {
    const allSegments = [
      { key: 'basico',  color: '#7a9e87', name: 'Básico',        count: planCount.basico + planCount.free },
      { key: 'premium', color: '#c9a84c', name: 'Premium',       count: planCount.premium },
      { key: 'ultra',   color: '#4a9eda', name: 'Ultra Premium',  count: planCount.ultra  },
    ];
    legend.innerHTML = allSegments.map(s => `
      <div class="plan-legend-item">
        <div class="plan-legend-dot" style="background:${s.color}"></div>
        <span class="plan-legend-name">${s.name}</span>
        <span class="plan-legend-val">${s.count}</span>
        <span class="plan-legend-pct">${total > 0 ? Math.round(s.count/total*100) : 0}%</span>
      </div>
    `).join('');
  }
}

/* ── RECENT USERS ────────────────────────── */
function renderRecentUsers() {
  const tbody = document.getElementById('recent-users-tbody');
  if (!tbody) return;

  const recent = [...allUsers]
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--gris-texto);padding:var(--sp-xl)">Sin usuarios registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(u => {
    const invCount = JSON.parse(localStorage.getItem('ia_invitations') || '[]')
      .filter(i => i.userId === u.id).length;
    const planBadge = planBadgeHTML(u.plan);
    return `
      <tr>
        <td class="primary">
          <div style="display:flex;align-items:center;gap:var(--sp-sm)">
            <div style="
              width:32px;height:32px;border-radius:50%;
              background:linear-gradient(135deg,var(--dorado-oscuro),var(--dorado));
              display:flex;align-items:center;justify-content:center;
              font-size:0.75rem;font-weight:700;color:var(--negro);flex-shrink:0;
            ">${(u.nombre||'?').charAt(0).toUpperCase()}</div>
            ${escHtml(u.nombre || '—')}
          </div>
        </td>
        <td>${escHtml(u.email)}</td>
        <td>${planBadge}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td>
          <span style="color:var(--dorado)">${invCount}</span>
          <span style="color:var(--gris-texto)"> invitación${invCount !== 1 ? 'es' : ''}</span>
        </td>
      </tr>
    `;
  }).join('');
}

/* ── ALL USERS ───────────────────────────── */
function renderAllUsers() {
  usersFiltered = [...allUsers];
  renderUsersTable();
}

window.filterUsers = () => {
  const q = document.getElementById('users-search')?.value?.toLowerCase() || '';
  usersFiltered = allUsers.filter(u =>
    (u.nombre || '').toLowerCase().includes(q) ||
    (u.email  || '').toLowerCase().includes(q)
  );
  renderUsersTable();
};

function renderUsersTable() {
  const tbody = document.getElementById('all-users-tbody');
  const count = document.getElementById('users-count');
  if (!tbody) return;

  if (count) count.textContent = `${usersFiltered.length} usuario${usersFiltered.length !== 1 ? 's' : ''}`;

  if (!usersFiltered.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--gris-texto);padding:var(--sp-xl)">Sin resultados</td></tr>`;
    return;
  }

  tbody.innerHTML = usersFiltered.map((u, idx) => {
    const invCount = allInvitations.filter(i => i.userId === u.id).length;
    return `
      <tr>
        <td style="color:var(--gris-texto)">${idx + 1}</td>
        <td class="primary">${escHtml(u.nombre || '—')}</td>
        <td>${escHtml(u.email)}</td>
        <td>${planBadgeHTML(u.plan)}</td>
        <td>${invCount}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button style="
              padding:4px 10px;font-size:0.68rem;
              background:transparent;border:1px solid var(--gris-borde);
              border-radius:4px;color:var(--gris-texto);cursor:pointer;
            " onclick="viewUserDetail('${u.id}')">Ver</button>
            <button style="
              padding:4px 10px;font-size:0.68rem;
              background:transparent;border:1px solid rgba(224,85,85,0.3);
              border-radius:4px;color:var(--rojo-error);cursor:pointer;
            " onclick="suspendUser('${u.id}')">Susp.</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.viewUserDetail = (id) => {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;
  const invs = allInvitations.filter(i => i.userId === id);
  Toast.info(`${user.nombre} · ${user.email} · ${invs.length} invitaciones`);
};

window.suspendUser = (id) => {
  Toast.info('Funcionalidad disponible con backend real');
};

window.exportUsers = () => {
  const headers = 'Nombre,Email,Plan,Invitaciones,Registro\n';
  const rows = allUsers.map(u => {
    const invs = allInvitations.filter(i => i.userId === u.id).length;
    return `"${u.nombre}","${u.email}","${u.plan || 'free'}",${invs},"${formatDate(u.createdAt)}"`;
  }).join('\n');
  downloadCSV('\uFEFF' + headers + rows, 'usuarios-invitarte.csv');
  Toast.success('Lista exportada');
};

/* ── ALL INVITATIONS ─────────────────────── */
function renderAllInvitations() {
  const tbody = document.getElementById('all-invitations-tbody');
  const count = document.getElementById('invitations-count');
  if (!tbody) return;

  if (count) count.textContent = `${allInvitations.length} invitación${allInvitations.length !== 1 ? 'es' : ''}`;

  if (!allInvitations.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--gris-texto);padding:var(--sp-xl)">Sin invitaciones</td></tr>`;
    return;
  }

  tbody.innerHTML = allInvitations.map(inv => {
    const user = allUsers.find(u => u.id === inv.userId);
    const statusBadge = {
      activa:   '<span class="badge badge--green">Activa</span>',
      borrador: '<span class="badge badge--gray">Borrador</span>',
      pausada:  '<span class="badge badge--red">Pausada</span>',
    }[inv.status] || '<span class="badge badge--gray">—</span>';

    const names = inv.novia && inv.novio
      ? `${inv.novia} & ${inv.novio}`
      : (inv.nombre || '—');

    return `
      <tr>
        <td style="color:var(--gris-texto);font-size:0.72rem">${inv.id.slice(0,10).toUpperCase()}</td>
        <td class="primary">${escHtml(names)}</td>
        <td>${escHtml(user?.nombre || '—')}</td>
        <td>${formatDate(inv.fecha) || '—'}</td>
        <td>${statusBadge}</td>
        <td><span style="color:var(--dorado)">${inv.views || 0}</span></td>
        <td>${planBadgeHTML(inv.plan)}</td>
      </tr>
    `;
  }).join('');
}

/* ── VENTAS ──────────────────────────────── */
function renderVentas() {
  const completedOrders = allOrders.filter(o => o.status === 'completed');
  const pendingOrders   = allOrders.filter(o => o.status === 'pending');
  const totalRevenue    = completedOrders.reduce((s,o) => s + (o.total||0), 0);
  const avgOrder        = completedOrders.length ? Math.round(totalRevenue / completedOrders.length) : 0;

  const kpisEl = document.getElementById('revenue-kpis');
  if (kpisEl) {
    kpisEl.innerHTML = `
      <div class="kpi-card kpi-card--gold" style="padding:var(--sp-lg)">
        <div class="kpi-label">Ingresos totales</div>
        <div class="kpi-value" style="font-size:2rem"><em>$${totalRevenue.toLocaleString()}</em></div>
        <div class="kpi-change flat">MXN</div>
      </div>
      <div class="kpi-card kpi-card--green" style="padding:var(--sp-lg)">
        <div class="kpi-label">Órdenes completadas</div>
        <div class="kpi-value" style="font-size:2rem"><em>${completedOrders.length}</em></div>
        <div class="kpi-change flat">${pendingOrders.length} pendientes</div>
      </div>
      <div class="kpi-card kpi-card--blue" style="padding:var(--sp-lg)">
        <div class="kpi-label">Ticket promedio</div>
        <div class="kpi-value" style="font-size:2rem"><em>$${avgOrder.toLocaleString()}</em></div>
        <div class="kpi-change flat">MXN por orden</div>
      </div>
    `;
  }

  const tbody = document.getElementById('orders-tbody');
  const count = document.getElementById('orders-count');
  if (!tbody) return;

  if (count) count.textContent = `${allOrders.length} órden${allOrders.length !== 1 ? 'es' : ''}`;

  if (!allOrders.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--gris-texto);padding:var(--sp-xl)">Sin órdenes registradas</td></tr>`;
    return;
  }

  tbody.innerHTML = [...allOrders]
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(o => {
      const user = allUsers.find(u => u.id === o.userId);
      const statusBadge = {
        completed: '<span class="badge badge--green">Completada</span>',
        pending:   '<span class="badge badge--gray">Pendiente</span>',
        failed:    '<span class="badge badge--red">Fallida</span>',
      }[o.status] || '<span class="badge badge--gray">—</span>';

      const methodIcon = {
        stripe:      '💳',
        mercadopago: '🏦',
        oxxo:        '🏪',
      }[o.method] || '💰';

      return `
        <tr>
          <td style="font-size:0.68rem;color:var(--gris-texto)">${o.id.slice(0,12).toUpperCase()}</td>
          <td class="primary">${escHtml(user?.nombre || '—')}</td>
          <td>${planBadgeHTML(o.planId)}</td>
          <td>${methodIcon} ${o.method || '—'}</td>
          <td><strong style="color:var(--dorado)">$${(o.total||0).toLocaleString()}</strong></td>
          <td>${statusBadge}</td>
          <td>${formatDate(o.createdAt)}</td>
        </tr>
      `;
    }).join('');
}

window.exportOrders = () => {
  const headers = 'ID,Usuario,Plan,Método,Total,Estado,Fecha\n';
  const rows = allOrders.map(o => {
    const user = allUsers.find(u => u.id === o.userId);
    return `"${o.id}","${user?.nombre||'—'}","${o.planId||'—'}","${o.method||'—'}",${o.total||0},"${o.status}","${formatDate(o.createdAt)}"`;
  }).join('\n');
  downloadCSV('\uFEFF' + headers + rows, 'ordenes-invitarte.csv');
  Toast.success('Órdenes exportadas');
};

/* ── SECTION NAVIGATION ──────────────────── */
window.adminSection = (name) => {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-nav__link').forEach(l => l.classList.remove('active'));

  const section = document.getElementById(`section-${name}`);
  if (section) section.classList.add('active');

  const link = document.querySelector(`[data-section="${name}"]`);
  if (link) link.classList.add('active');

  const titles = {
    dashboard:     'Dashboard',
    usuarios:      'Usuarios',
    invitaciones:  'Invitaciones',
    ventas:        'Ventas & Ingresos',
  };
  const titleEl = document.getElementById('admin-topbar-title');
  if (titleEl) titleEl.textContent = titles[name] || 'Admin';

  // Close mobile sidebar
  document.getElementById('admin-sidebar')?.classList.remove('open');
};

/* ── MOBILE ──────────────────────────────── */
function initMobileAdmin() {
  const burger = document.getElementById('admin-burger');
  if (window.innerWidth <= 768 && burger) burger.style.display = 'block';

  window.addEventListener('resize', () => {
    const b = document.getElementById('admin-burger');
    if (b) b.style.display = window.innerWidth <= 768 ? 'block' : 'none';
  });
}

window.toggleAdminSidebar = () => {
  document.getElementById('admin-sidebar')?.classList.toggle('open');
};

/* ── HELPERS ─────────────────────────────── */
function planBadgeHTML(plan) {
  const map = {
    free:    '<span class="badge badge--gray">Free</span>',
    basico:  '<span class="badge badge--gray">Básico</span>',
    premium: '<span class="badge badge--gold">Premium</span>',
    ultra:   '<span class="badge" style="background:rgba(74,158,218,0.15);color:#7abfed;border:1px solid rgba(74,158,218,0.3)">Ultra</span>',
  };
  return map[plan] || map.free;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
