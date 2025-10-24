const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
require("dotenv").config();

// Importar rutas
const usuarioRoutes = require("./routes/usuarioRoutes");
const proyectoRoutes = require("./routes/proyectoRoutes");
const mensajeRoutes = require("./routes/mensajeRoutes");
const notificacionRoutes = require("./routes/notificacionRoutes");
const cambioProyectoRoutes = require("./routes/cambioProyectoRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const protegidaRoutes = require("./routes/protegidaRoutes");
const proyectoDocumentosRoutes = require("./routes/proyectoDocumentosRoutes");

// 1) Inicializar Express
const app = express();

// 2) Middlewares globales
app.use(cors());
// Primero parsea JSON…
app.use(express.json({ limit: "20mb" })); // (opcional: agrega límite)
// …luego sanitiza body, query y params
app.use((req, res, next) => {
  try {
    if (req.body)   req.body   = mongoSanitize.sanitize(req.body);
    if (req.params) req.params = mongoSanitize.sanitize(req.params);
    // ⚠️ NO reasignamos req.query porque en Express 5 es “getter only”.
    // Si necesitas sanitizar query, haz una copia a una propiedad tuya, ej:
    // req.safeQuery = mongoSanitize.sanitize(req.query);
    next();
  } catch (e) {
    console.error("Error sanitizando request:", e);
    next(e);
  }
});

// 3) Conectar a MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error al conectar MongoDB:", err));

// 4) HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
});
app.set("io", io);

// 5) Rutas
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/protegida", protegidaRoutes);
app.use("/api/proyectos", proyectoRoutes);
app.use("/api/mensajes", mensajeRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/cambios", cambioProyectoRoutes);
app.use("/api/archivos", uploadRoutes);
app.use("/api", proyectoDocumentosRoutes);

// 6) Socket.IO handlers
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);

  socket.on("nuevo-mensaje", (msg) => {
    io.emit("mensaje-actualizado", msg);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

// 7) Iniciar servidor
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
