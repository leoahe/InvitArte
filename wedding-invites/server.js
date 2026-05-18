const express = require("express");
const path = require("path");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// ===============================
// 📁 Archivos estáticos
// ===============================
app.use(express.static(path.join(__dirname, "public")));

// Página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// 🗄️ Conexión a SQLite
// ===============================
const dbPath = path.join(__dirname, "..", "database", "database.sqlite");
console.log("📂 Ruta SQLite:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error al conectar a SQLite", err);
  } else {
    console.log("✅ Conectado a SQLite");
  }
});

// ===============================
// 📦 API - Crear pedido
// ===============================
app.post("/api/pedidos", (req, res) => {
  const {
    nombres,
    fecha,
    mensaje,
    plan,
    diseno,
    email,
    telefono
  } = req.body;

  if (!nombres || !fecha || !plan || !diseno) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  const sql = `
    INSERT INTO pedidos
    (nombres, fecha, mensaje, plan, diseno, email, telefono, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')
  `;

  const params = [
    nombres,
    fecha,
    mensaje || "",
    plan,
    diseno,
    email || "",
    telefono || ""
  ];

  db.run(sql, params, function (err) {
  if (err) {
    console.error("❌ Error SQLite:", err.message);
    return res.status(500).json({
      error: "Error al guardar pedido",
      detalle: err.message
    });
  }

    res.json({
      success: true,
      pedidoId: this.lastID
    });
  });
});

// ===============================
// 🚀 Iniciar servidor
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Servidor funcionando en http://localhost:${PORT}`);
});

