const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

const pedidosRoutes = require("./routes/pedidos");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Archivos públicos
app.use(express.static(path.join(__dirname, "wedding-invites", "public")));

// API
app.use("/api/pedidos", pedidosRoutes);

// Home
app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "wedding-invites", "public", "index.html")
  );
});

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
