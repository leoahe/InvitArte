const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const router = express.Router();

// DB
const dbPath = path.join(__dirname, "../database/database.sqlite");
const db = new sqlite3.Database(dbPath);

// Crear tabla si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS pedidos (
    id TEXT PRIMARY KEY,
    nombres TEXT,
    fecha TEXT,
    mensaje TEXT,
    plan TEXT,
    diseno TEXT,
    estado TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Crear pedido
router.post("/", (req, res) => {
  const { nombres, fecha, mensaje, plan, diseno } = req.body;

  if (!nombres || !plan) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  const pedido = {
    id: uuidv4(),
    nombres,
    fecha,
    mensaje,
    plan,
    diseno,
    estado: "pendiente"
  };

  db.run(
    `INSERT INTO pedidos (id, nombres, fecha, mensaje, plan, diseno, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      pedido.id,
      pedido.nombres,
      pedido.fecha,
      pedido.mensaje,
      pedido.plan,
      pedido.diseno,
      pedido.estado
    ],
    err => {
      if (err) {
        return res.status(500).json({ error: "Error al guardar pedido" });
      }
      res.json(pedido);
    }
  );
});

module.exports = router;
