/**
 * INVITARTE — DATABASE INIT
 * Inicializa el esquema de la base de datos SQLite de forma segura.
 * Se ejecuta una vez al arrancar el servidor.
 */
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '..', 'database', 'database.sqlite');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');      // Mejor rendimiento concurrente
    db.pragma('foreign_keys = ON');       // Integridad referencial
    db.pragma('secure_delete = ON');      // Sobreescribir datos borrados
  }
  return db;
}

function initSchema() {
  const db = getDB();

  db.exec(`
    -- ══════════════════════════════════════════
    -- TABLA: usuarios
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS usuarios (
      id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      nombre        TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      telefono      TEXT,
      password_hash TEXT NOT NULL,        -- bcrypt hash, NUNCA texto plano
      plan          TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free','esencial','elegante','premium')),
      rol           TEXT NOT NULL DEFAULT 'usuario' CHECK(rol IN ('usuario','admin')),
      email_verificado INTEGER NOT NULL DEFAULT 0,
      activo        INTEGER NOT NULL DEFAULT 1,
      intentos_fallidos INTEGER NOT NULL DEFAULT 0,
      bloqueado_hasta   TEXT,             -- ISO timestamp de bloqueo temporal
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    -- ══════════════════════════════════════════
    -- TABLA: sesiones (refresh tokens)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS sesiones (
      id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      usuario_id    TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      refresh_token TEXT NOT NULL UNIQUE,
      user_agent    TEXT,
      ip            TEXT,
      expires_at    TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      revocado      INTEGER NOT NULL DEFAULT 0
    );

    -- ══════════════════════════════════════════
    -- TABLA: tokens de verificación / recuperación
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS tokens_temporales (
      id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,   -- SHA-256 del token, NUNCA el token en claro
      tipo       TEXT NOT NULL CHECK(tipo IN ('verificacion_email','reset_password')),
      expires_at TEXT NOT NULL,
      usado      INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    -- ══════════════════════════════════════════
    -- TABLA: invitaciones (relacionada con usuario)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS invitaciones (
      id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      usuario_id   TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      diseno       INTEGER NOT NULL DEFAULT 1,
      nombres      TEXT NOT NULL,
      fecha_evento TEXT NOT NULL,
      mensaje      TEXT,
      plan         TEXT NOT NULL,
      activa       INTEGER NOT NULL DEFAULT 1,
      expires_at   TEXT,
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    -- ══════════════════════════════════════════
    -- ÍNDICES para búsquedas frecuentes
    -- ══════════════════════════════════════════
    CREATE INDEX IF NOT EXISTS idx_usuarios_email        ON usuarios(email);
    CREATE INDEX IF NOT EXISTS idx_sesiones_usuario      ON sesiones(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_sesiones_token        ON sesiones(refresh_token);
    CREATE INDEX IF NOT EXISTS idx_tokens_hash           ON tokens_temporales(token_hash);
    CREATE INDEX IF NOT EXISTS idx_invitaciones_usuario  ON invitaciones(usuario_id);

    -- ══════════════════════════════════════════
    -- TRIGGER: actualizar updated_at automáticamente
    -- ══════════════════════════════════════════
    CREATE TRIGGER IF NOT EXISTS trg_usuarios_updated_at
    AFTER UPDATE ON usuarios
    BEGIN
      UPDATE usuarios SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_invitaciones_updated_at
    AFTER UPDATE ON invitaciones
    BEGIN
      UPDATE invitaciones SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = NEW.id;
    END;
  `);

  console.log('✅ Esquema de base de datos iniciado correctamente');
  return db;
}

module.exports = { getDB, initSchema };
