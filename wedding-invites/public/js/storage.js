/**
 * INVITARTE — STORAGE.JS
 * Capa de persistencia local.
 * Estructura preparada para reemplazar con API calls en producción.
 * Todas las funciones retornan Promises para simular async.
 */

const InvitArteDB = (() => {
  /* ── KEYS ────────────────────────────────── */
  const KEYS = {
    USERS:        'ia_users',
    CURRENT_USER: 'ia_session',
    INVITATIONS:  'ia_invitations',
    GUESTS:       'ia_guests',
    ORDERS:       'ia_orders',
  };

  /* ── HELPERS ─────────────────────────────── */
  const get = (key) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  };

  const set = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  };

  const generateId = () =>
    Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

  const delay = (ms = 300) =>
    new Promise(resolve => setTimeout(resolve, ms));

  /* ── USUARIOS ────────────────────────────── */
  const users = {
    async getAll() {
      await delay(100);
      return get(KEYS.USERS) || [];
    },

    async findByEmail(email) {
      const users = await this.getAll();
      return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    },

    async create(userData) {
      await delay(400);
      const all = await this.getAll();

      const exists = all.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
      if (exists) throw new Error('Este correo ya está registrado');

      const newUser = {
        id: generateId(),
        nombre: userData.nombre.trim(),
        email: userData.email.trim().toLowerCase(),
        telefono: userData.telefono || '',
        passwordHash: btoa(userData.password), // producción: bcrypt/argon2
        plan: 'free',
        createdAt: new Date().toISOString(),
        avatar: null,
      };

      all.push(newUser);
      set(KEYS.USERS, all);
      return { ...newUser, passwordHash: undefined };
    },

    async login(email, password) {
      await delay(500);
      const all = await this.getAll();
      const user = all.find(
        u => u.email.toLowerCase() === email.toLowerCase() &&
             u.passwordHash === btoa(password)
      );
      if (!user) throw new Error('Correo o contraseña incorrectos');
      const session = { ...user, passwordHash: undefined };
      set(KEYS.CURRENT_USER, session);
      return session;
    },

    async logout() {
      localStorage.removeItem(KEYS.CURRENT_USER);
      return true;
    },

    async getCurrentUser() {
      return get(KEYS.CURRENT_USER);
    },

    async update(userId, data) {
      const all = await this.getAll();
      const idx = all.findIndex(u => u.id === userId);
      if (idx === -1) throw new Error('Usuario no encontrado');
      all[idx] = { ...all[idx], ...data };
      set(KEYS.USERS, all);
      const session = get(KEYS.CURRENT_USER);
      if (session && session.id === userId) {
        set(KEYS.CURRENT_USER, { ...session, ...data });
      }
      return all[idx];
    },

    async resetPasswordRequest(email) {
      await delay(600);
      const user = await this.findByEmail(email);
      if (!user) throw new Error('No existe cuenta con ese correo');
      const token = generateId();
      const all = await this.getAll();
      const idx = all.findIndex(u => u.email === user.email);
      all[idx].resetToken = token;
      all[idx].resetExpiry = Date.now() + 3600000;
      set(KEYS.USERS, all);
      return token; // en producción se envía por email
    },

    async resetPassword(token, newPassword) {
      await delay(400);
      const all = await this.getAll();
      const user = all.find(u => u.resetToken === token && u.resetExpiry > Date.now());
      if (!user) throw new Error('Token inválido o expirado');
      const idx = all.findIndex(u => u.id === user.id);
      all[idx].passwordHash = btoa(newPassword);
      all[idx].resetToken = null;
      all[idx].resetExpiry = null;
      set(KEYS.USERS, all);
      return true;
    }
  };

  /* ── INVITACIONES ────────────────────────── */
  const invitations = {
    async getAllByUser(userId) {
      await delay(200);
      const all = get(KEYS.INVITATIONS) || [];
      return all.filter(i => i.userId === userId);
    },

    async getById(id) {
      const all = get(KEYS.INVITATIONS) || [];
      return all.find(i => i.id === id) || null;
    },

    async create(userId, data) {
      await delay(400);
      const all = get(KEYS.INVITATIONS) || [];
      const invitation = {
        id: generateId(),
        userId,
        slug: generateId().substr(0, 10),
        status: 'borrador',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        rsvpCount: 0,
        ...data,
      };
      all.push(invitation);
      set(KEYS.INVITATIONS, all);
      return invitation;
    },

    async update(id, data) {
      await delay(300);
      const all = get(KEYS.INVITATIONS) || [];
      const idx = all.findIndex(i => i.id === id);
      if (idx === -1) throw new Error('Invitación no encontrada');
      all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
      set(KEYS.INVITATIONS, all);
      return all[idx];
    },

    async delete(id) {
      await delay(300);
      const all = get(KEYS.INVITATIONS) || [];
      const filtered = all.filter(i => i.id !== id);
      set(KEYS.INVITATIONS, filtered);
      return true;
    },

    async incrementViews(id) {
      const all = get(KEYS.INVITATIONS) || [];
      const idx = all.findIndex(i => i.id === id);
      if (idx !== -1) {
        all[idx].views = (all[idx].views || 0) + 1;
        set(KEYS.INVITATIONS, all);
      }
    }
  };

  /* ── INVITADOS ───────────────────────────── */
  const guests = {
    async getAllByInvitation(invitationId) {
      await delay(150);
      const all = get(KEYS.GUESTS) || [];
      return all.filter(g => g.invitationId === invitationId);
    },

    async create(invitationId, guestData) {
      await delay(200);
      const all = get(KEYS.GUESTS) || [];
      const guest = {
        id: generateId(),
        invitationId,
        nombre: guestData.nombre.trim(),
        pases: parseInt(guestData.pases) || 1,
        mesa: guestData.mesa || '',
        confirmed: null,
        createdAt: new Date().toISOString(),
      };
      all.push(guest);
      set(KEYS.GUESTS, all);
      return guest;
    },

    async bulkCreate(invitationId, guestsArray) {
      await delay(500);
      const all = get(KEYS.GUESTS) || [];
      const existing = all.filter(g => g.invitationId === invitationId);
      const newGuests = guestsArray.map(g => ({
        id: generateId(),
        invitationId,
        nombre: g.nombre.trim(),
        pases: parseInt(g.pases) || 1,
        mesa: g.mesa || '',
        confirmed: null,
        createdAt: new Date().toISOString(),
      }));
      const allUpdated = [
        ...all.filter(g => g.invitationId !== invitationId),
        ...existing,
        ...newGuests
      ];
      set(KEYS.GUESTS, allUpdated);
      return newGuests;
    },

    async update(id, data) {
      await delay(200);
      const all = get(KEYS.GUESTS) || [];
      const idx = all.findIndex(g => g.id === id);
      if (idx === -1) throw new Error('Invitado no encontrado');
      all[idx] = { ...all[idx], ...data };
      set(KEYS.GUESTS, all);
      return all[idx];
    },

    async delete(id) {
      await delay(200);
      const all = get(KEYS.GUESTS) || [];
      set(KEYS.GUESTS, all.filter(g => g.id !== id));
      return true;
    },

    async deleteAllByInvitation(invitationId) {
      await delay(300);
      const all = get(KEYS.GUESTS) || [];
      set(KEYS.GUESTS, all.filter(g => g.invitationId !== invitationId));
      return true;
    }
  };

  /* ── ÓRDENES ─────────────────────────────── */
  const orders = {
    async getAllByUser(userId) {
      await delay(200);
      const all = get(KEYS.ORDERS) || [];
      return all.filter(o => o.userId === userId);
    },

    async create(userId, orderData) {
      await delay(600);
      const all = get(KEYS.ORDERS) || [];
      const order = {
        id: generateId(),
        userId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...orderData,
      };
      all.push(order);
      set(KEYS.ORDERS, all);
      return order;
    },

    async updateStatus(id, status) {
      const all = get(KEYS.ORDERS) || [];
      const idx = all.findIndex(o => o.id === id);
      if (idx !== -1) {
        all[idx].status = status;
        all[idx].updatedAt = new Date().toISOString();
        set(KEYS.ORDERS, all);
      }
    }
  };

  /* ── ADMIN STATS ─────────────────────────── */
  const admin = {
    async getStats() {
      await delay(300);
      const allUsers = get(KEYS.USERS) || [];
      const allInvitations = get(KEYS.INVITATIONS) || [];
      const allOrders = get(KEYS.ORDERS) || [];

      const revenue = allOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const planCounts = allUsers.reduce((acc, u) => {
        acc[u.plan] = (acc[u.plan] || 0) + 1;
        return acc;
      }, {});

      return {
        totalUsers: allUsers.length,
        totalInvitations: allInvitations.length,
        totalOrders: allOrders.length,
        revenue,
        planCounts,
        activeInvitations: allInvitations.filter(i => i.status === 'activa').length,
        recentUsers: [...allUsers]
          .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
          .map(u => ({ ...u, passwordHash: undefined })),
      };
    }
  };

  /* ── SEEDDATA (para demo) ────────────────── */
  const seed = () => {
    if (get(KEYS.USERS) !== null) return;
    const demo = [{
      id: 'demo001',
      nombre: 'Ana García',
      email: 'demo@invitarte.mx',
      telefono: '5555555555',
      passwordHash: btoa('Demo1234!'),
      plan: 'premium',
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      avatar: null,
    }];
    set(KEYS.USERS, demo);

    const demoInvitation = [{
      id: 'inv001',
      userId: 'demo001',
      slug: 'ana-y-carlos',
      status: 'activa',
      novio: 'Carlos Méndez',
      novia: 'Ana García',
      fecha: '2025-11-15',
      hora: '18:00',
      lugarCeremonia: 'Catedral Metropolitana, CDMX',
      lugarRecepcion: 'Hacienda Los Morales',
      template: 'clasico',
      plan: 'premium',
      views: 142,
      rsvpCount: 67,
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      updatedAt: new Date().toISOString(),
    }];
    set(KEYS.INVITATIONS, demoInvitation);
  };

  /* ── INIT ────────────────────────────────── */
  seed();

  return { users, invitations, guests, orders, admin, generateId };
})();

window.InvitArteDB = InvitArteDB;
