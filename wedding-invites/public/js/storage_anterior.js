/**
 * INVITARTE — STORAGE.JS (versión con API real)
 *
 * Reemplaza la versión anterior que usaba localStorage con btoa().
 * Ahora conecta con el backend Node.js seguro.
 *
 * CAMBIOS DE SEGURIDAD:
 * - Contraseñas NUNCA se almacenan en el cliente (ni en localStorage)
 * - El access token (JWT) vive en memoria RAM (no localStorage) → inmune a XSS
 * - El refresh token vive en httpOnly cookie → no accesible desde JS
 * - Auto-renovación transparente del access token
 * - Compatible con la API de autenticación (auth.js)
 */

const InvitArteDB = (() => {

  /* ── CONFIGURACIÓN ──────────────────────── */
  const API_BASE = '';  // Mismo origen que el servidor

  /* ── ESTADO EN MEMORIA ──────────────────── */
  // El access token se guarda EN MEMORIA, no en localStorage.
  // Al recargar la página, se renueva automáticamente con el refresh token (cookie httpOnly).
  let _accessToken  = null;
  let _currentUser  = null;
  let _refreshTimer = null;

  /* ── HELPERS ────────────────────────────── */
  function getHeaders(withAuth = true) {
    const h = { 'Content-Type': 'application/json' };
    if (withAuth && _accessToken) h['Authorization'] = `Bearer ${_accessToken}`;
    return h;
  }

  async function apiFetch(endpoint, options = {}) {
    const res = await fetch(API_BASE + endpoint, {
      ...options,
      credentials: 'include',   // Enviar cookies httpOnly (refresh token)
      headers: { ...getHeaders(options.auth !== false), ...(options.headers || {}) },
    });

    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.message || 'Error en la solicitud');
      err.code   = data.code;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* ── AUTO-RENOVACIÓN DEL ACCESS TOKEN ───── */
  function scheduleTokenRefresh(expiresIn = 14 * 60 * 1000) {
    // Renovar 1 minuto antes de que expire (14 minutos por defecto si expira en 15)
    if (_refreshTimer) clearTimeout(_refreshTimer);
    _refreshTimer = setTimeout(async () => {
      try {
        await users.refresh();
      } catch {
        // Si falla el refresh, limpiar sesión
        users._clearSession();
      }
    }, Math.max(expiresIn - 60000, 30000));
  }

  /* ── MÓDULO USUARIOS ────────────────────── */
  const users = {

    // Estado actual del usuario
    current() { return _currentUser; },
    isLoggedIn() { return !!_accessToken && !!_currentUser; },

    _setSession(data) {
      _accessToken  = data.accessToken;
      _currentUser  = data.user;
      // Guardar solo info NO sensible en localStorage (para UI persistente entre páginas)
      try {
        localStorage.setItem('ia_user_name', data.user.nombre || '');
        localStorage.setItem('ia_user_email', data.user.email || '');
        localStorage.setItem('ia_user_plan', data.user.plan || 'free');
        localStorage.setItem('ia_user_rol', data.user.rol || 'usuario');
      } catch {}
      // Programar renovación automática (JWT expira en 15 min por defecto)
      scheduleTokenRefresh(14 * 60 * 1000);
    },

    _clearSession() {
      _accessToken  = null;
      _currentUser  = null;
      if (_refreshTimer) { clearTimeout(_refreshTimer); _refreshTimer = null; }
      try {
        localStorage.removeItem('ia_user_name');
        localStorage.removeItem('ia_user_email');
        localStorage.removeItem('ia_user_plan');
        localStorage.removeItem('ia_user_rol');
      } catch {}
    },

    /* ── REGISTRO ── */
    async create(userData) {
      const data = await apiFetch('/api/auth/registro', {
        method: 'POST',
        auth: false,
        body: JSON.stringify(userData),
      });
      this._setSession(data);
      return data.user;
    },

    /* ── LOGIN ── */
    async login(email, password) {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email, password }),
      });
      this._setSession(data);
      return data.user;
    },

    /* ── LOGOUT ── */
    async logout() {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      } catch {}
      this._clearSession();
      window.location.href = '/login.html';
    },

    /* ── RENOVAR TOKEN (refresh) ── */
    async refresh() {
      try {
        const data = await apiFetch('/api/auth/refresh', {
          method: 'POST',
          auth: false,
        });
        _accessToken = data.accessToken;
        scheduleTokenRefresh(14 * 60 * 1000);
        return data.accessToken;
      } catch (err) {
        this._clearSession();
        throw err;
      }
    },

    /* ── DATOS DEL USUARIO ACTUAL ── */
    async me() {
      const data = await apiFetch('/api/auth/me');
      _currentUser = data.user;
      return data.user;
    },

    /* ── VERIFICAR EMAIL ── */
    async verifyEmail(token) {
      return apiFetch('/api/auth/verificar-email', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ token }),
      });
    },

    /* ── SOLICITAR RESET DE CONTRASEÑA ── */
    async resetPasswordRequest(email) {
      return apiFetch('/api/auth/solicitar-reset', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email }),
      });
    },

    /* ── APLICAR NUEVA CONTRASEÑA ── */
    async resetPassword(token, newPassword) {
      return apiFetch('/api/auth/reset-password', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ token, newPassword }),
      });
    },

    /* ── REDIRECCIÓN SI YA ESTÁ LOGUEADO ── */
    async redirectIfLoggedIn(dest = '/dashboard.html') {
      try {
        await this.refresh();
        if (_accessToken) {
          window.location.href = dest;
          return true;
        }
      } catch {}
      return false;
    },

    /* ── REQUERIR AUTENTICACIÓN ── */
    async requireAuth(loginUrl = '/login.html') {
      // Intentar renovar el token silenciosamente
      if (!_accessToken) {
        try {
          await this.refresh();
        } catch {
          window.location.href = loginUrl;
          return false;
        }
      }
      return true;
    },
  };

  /* ── MÓDULO INVITACIONES ────────────────── */
  const invitations = {
    async getAll() {
      const data = await apiFetch('/api/usuario/invitaciones');
      return data.invitaciones || [];
    },
  };

  /* ── INICIALIZACIÓN AUTOMÁTICA ──────────── */
  // Al cargar el script, intentar renovar el token silenciosamente
  // (el refresh token httpOnly se envía automáticamente con credentials: 'include')
  (async () => {
    const page = window.location.pathname.split('/').pop();
    const publicPages = ['login.html', 'registro.html', 'recuperar.html', 'index.html', ''];

    // En páginas privadas: renovar o redirigir al login
    if (!publicPages.includes(page)) {
      try {
        const data = await apiFetch('/api/auth/refresh', { method: 'POST', auth: false });
        _accessToken = data.accessToken;
        scheduleTokenRefresh(14 * 60 * 1000);
        // Obtener datos del usuario
        const me = await apiFetch('/api/auth/me');
        _currentUser = me.user;
      } catch {
        window.location.href = '/login.html';
      }
    }
  })();

  /* ── API PÚBLICA ────────────────────────── */
  return { users, invitations };

})();

// Exponer globalmente para compatibilidad con auth.js y dashboard.js
window.InvitArteDB = InvitArteDB;
window.Auth = {
  redirectIfLoggedIn: (...args) => InvitArteDB.users.redirectIfLoggedIn(...args),
  requireAuth:        (...args) => InvitArteDB.users.requireAuth(...args),
  logout:             ()        => InvitArteDB.users.logout(),
  getCurrentUser:     ()        => InvitArteDB.users.current(),
};
