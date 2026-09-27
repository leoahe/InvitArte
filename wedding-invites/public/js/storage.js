/**
 * INVITARTE — STORAGE.JS
 * Registro/login con bcrypt en el servidor.
 * Sesión en localStorage — compatible con dashboard.js existente.
 * Invitaciones, invitados y órdenes en localStorage (sin cambios).
 */
const InvitArteDB = (() => {

  const API  = '/api/auth';
  const KEYS = {
    CURRENT_USER: 'ia_session',
    INVITATIONS:  'ia_invitations',
    GUESTS:       'ia_guests',
    ORDERS:       'ia_orders',
    USERS:        'ia_users',
  };

  const lsGet = (k) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):null; } catch{return null;} };
  const lsSet = (k,v)=> { try { localStorage.setItem(k,JSON.stringify(v)); return true; } catch{return false;} };
  const lsDel = (k)  => { try { localStorage.removeItem(k); } catch{} };
  const generateId   = () => Date.now().toString(36)+Math.random().toString(36).substr(2,9);
  const delay = (ms=300) => new Promise(r=>setTimeout(r,ms));

  // Llamada a la API del servidor
  async function apiFetch(path, opts={}) {
    let res, data;
    try {
      res = await fetch(API+path, {
        credentials: 'include',
        headers: { 'Content-Type':'application/json', ...(opts.headers||{}) },
        ...opts,
      });
    } catch { throw new Error('Sin conexión con el servidor. ¿Está corriendo node server.js?'); }
    try { data = await res.json(); } catch { throw new Error('Error de conexión con el servidor'); }
    if (!res.ok) {
      const err = new Error(data.message || 'Error del servidor');
      err.code   = data.code;
      err.errors = data.errors || [];
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // Guardar sesión en localStorage con el formato exacto que usa dashboard.js
  function saveSession(user) {
    const session = {
      id:        user.id,
      nombre:    user.nombre,
      email:     user.email,
      telefono:  user.telefono  || '',
      plan:      user.plan      || 'free',
      rol:       user.rol       || 'usuario',
      createdAt: user.created_at|| user.createdAt || new Date().toISOString(),
      avatar:    user.avatar    || null,
    };
    lsSet(KEYS.CURRENT_USER, session);
    return session;
  }

  /* ── USUARIOS ── */
  const users = {
    async create(userData) {
      const data = await apiFetch('/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre:   (userData.nombre   || '').trim(),
          apellido: (userData.apellido || '').trim(),
          email:    (userData.email    || '').trim(),
          telefono: (userData.telefono || '').trim(),
          password:  userData.password,
        }),
      });
      return saveSession(data.user);
    },

    async login(email, password) {
      const data = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return saveSession(data.user);
    },

    async logout() {
      try { await apiFetch('/logout', { method:'POST' }); } catch {}
      lsDel(KEYS.CURRENT_USER);
      window.location.href = '/login.html';
    },

    async getCurrentUser() {
      return lsGet(KEYS.CURRENT_USER);
    },

    async update(userId, data) {
      const session = lsGet(KEYS.CURRENT_USER);
      if (!session) throw new Error('No hay sesión activa');
      const updated = { ...session, ...data };
      lsSet(KEYS.CURRENT_USER, updated);
      return updated;
    },

    async resetPasswordRequest(email) {
      const data = await apiFetch('/solicitar-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      // En desarrollo: mostrar token en la UI para pruebas
      if (data._devToken) {
        window._resetToken = data._devToken;
        // Mostrar bloque dev en recuperar.html
        const devBlock = document.getElementById('dev-block');
        const devTok   = document.getElementById('dev-token');
        if (devBlock) devBlock.style.display = 'block';
        if (devTok)   devTok.textContent = data._devToken;
      }
      return data;
    },

    async resetPassword(token, newPassword) {
      await apiFetch('/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      lsDel(KEYS.CURRENT_USER);
      return true;
    },

    // Compatibilidad con utils.js
    async getAll()           { return []; },
    async findByEmail(email) { return null; },

    redirectIfLoggedIn: async (dest='/dashboard.html') => {
      const u = lsGet(KEYS.CURRENT_USER);
      if (u) { window.location.href = dest; return true; }
      return false;
    },
    requireAuth: async (loginUrl='/login.html') => {
      const u = lsGet(KEYS.CURRENT_USER);
      if (!u) { window.location.href = loginUrl; return false; }
      return true;
    },
  };

  /* ── INVITACIONES (localStorage — sin cambios) ── */
  const invitations = {
    async getAllByUser(userId) {
      await delay(100);
      return (lsGet(KEYS.INVITATIONS)||[]).filter(i=>i.userId===userId);
    },
    async getById(id) {
      return (lsGet(KEYS.INVITATIONS)||[]).find(i=>i.id===id)||null;
    },
    async create(userId, data) {
      await delay(300);
      const all = lsGet(KEYS.INVITATIONS)||[];
      const inv = { id:generateId(), userId, slug:generateId().substr(0,10),
        status:'borrador', createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(), views:0, rsvpCount:0, ...data };
      all.push(inv); lsSet(KEYS.INVITATIONS,all); return inv;
    },
    async update(id, data) {
      await delay(200);
      const all=lsGet(KEYS.INVITATIONS)||[];
      const idx=all.findIndex(i=>i.id===id);
      if(idx===-1) throw new Error('Invitación no encontrada');
      all[idx]={...all[idx],...data,updatedAt:new Date().toISOString()};
      lsSet(KEYS.INVITATIONS,all); return all[idx];
    },
    async delete(id) {
      lsSet(KEYS.INVITATIONS,(lsGet(KEYS.INVITATIONS)||[]).filter(i=>i.id!==id));
      return true;
    },
    async incrementViews(id) {
      const all=lsGet(KEYS.INVITATIONS)||[];
      const idx=all.findIndex(i=>i.id===id);
      if(idx!==-1){all[idx].views=(all[idx].views||0)+1;lsSet(KEYS.INVITATIONS,all);}
    },
  };

  /* ── INVITADOS (localStorage — sin cambios) ── */
  const guests = {
    async getAllByInvitation(invitationId) {
      await delay(100);
      return (lsGet(KEYS.GUESTS)||[]).filter(g=>g.invitationId===invitationId);
    },
    async create(invitationId, guestData) {
      const all=lsGet(KEYS.GUESTS)||[];
      const g={id:generateId(),invitationId,nombre:guestData.nombre.trim(),
        pases:parseInt(guestData.pases)||1,mesa:guestData.mesa||'',
        confirmed:null,createdAt:new Date().toISOString()};
      all.push(g); lsSet(KEYS.GUESTS,all); return g;
    },
    async bulkCreate(invitationId, guestsArray) {
      await delay(400);
      const all=lsGet(KEYS.GUESTS)||[];
      const existing=all.filter(g=>g.invitationId===invitationId);
      const newG=guestsArray.map(g=>({id:generateId(),invitationId,
        nombre:g.nombre.trim(),pases:parseInt(g.pases)||1,mesa:g.mesa||'',
        confirmed:null,createdAt:new Date().toISOString()}));
      lsSet(KEYS.GUESTS,[...all.filter(g=>g.invitationId!==invitationId),...existing,...newG]);
      return newG;
    },
    async update(id, data) {
      const all=lsGet(KEYS.GUESTS)||[];
      const idx=all.findIndex(g=>g.id===id);
      if(idx===-1) throw new Error('Invitado no encontrado');
      all[idx]={...all[idx],...data}; lsSet(KEYS.GUESTS,all); return all[idx];
    },
    async delete(id) {
      lsSet(KEYS.GUESTS,(lsGet(KEYS.GUESTS)||[]).filter(g=>g.id!==id)); return true;
    },
    async deleteAllByInvitation(invitationId) {
      lsSet(KEYS.GUESTS,(lsGet(KEYS.GUESTS)||[]).filter(g=>g.invitationId!==invitationId));
      return true;
    },
  };

  /* ── ÓRDENES (localStorage — sin cambios) ── */
  const orders = {
    async getAllByUser(userId) {
      await delay(100);
      return (lsGet(KEYS.ORDERS)||[]).filter(o=>o.userId===userId);
    },
    async create(userId, orderData) {
      const all=lsGet(KEYS.ORDERS)||[];
      const order={id:generateId(),userId,status:'pending',
        createdAt:new Date().toISOString(),...orderData};
      all.push(order); lsSet(KEYS.ORDERS,all); return order;
    },
    async updateStatus(id, status) {
      const all=lsGet(KEYS.ORDERS)||[];
      const idx=all.findIndex(o=>o.id===id);
      if(idx!==-1){all[idx].status=status;all[idx].updatedAt=new Date().toISOString();
        lsSet(KEYS.ORDERS,all);}
    },
  };

  /* ── ADMIN ── */
  const admin = {
    async getStats() {
      const allInv=lsGet(KEYS.INVITATIONS)||[];
      const allOrd=lsGet(KEYS.ORDERS)||[];
      return { totalUsers:0, totalInvitations:allInv.length, totalOrders:allOrd.length,
        revenue:0, planCounts:{}, activeInvitations:allInv.filter(i=>i.status==='activa').length,
        recentUsers:[] };
    },
  };

  return { users, invitations, guests, orders, admin, generateId };
})();

window.InvitArteDB = InvitArteDB;

// Auth global — compatible con utils.js que lo sobreescribe después
if (typeof window.Auth === 'undefined') {
  window.Auth = {
    async requireLogin(redirectTo='/login.html') {
      const u = await InvitArteDB.users.getCurrentUser();
      if (!u) { window.location.href = redirectTo; return null; }
      return u;
    },
    async redirectIfLoggedIn(to='/dashboard.html') {
      await InvitArteDB.users.redirectIfLoggedIn(to);
    },
    async logout() { await InvitArteDB.users.logout(); },
  };
}
