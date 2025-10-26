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

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use((req, res, next) => {
  try {
    if (req.body)   req.body   = mongoSanitize.sanitize(req.body);
    if (req.params) req.params = mongoSanitize.sanitize(req.params);
    next();
  } catch (e) {
    console.error("Error sanitizando request:", e);
    next(e);
  }
});

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error al conectar MongoDB:", err));

// HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
}); 
app.set("io", io);

// Rutas
app.use("/api/usuarios", usuarioRoutes);     // login público aquí
app.use("/api/protegida", protegidaRoutes);  // para probar token
app.use("/api/proyectos", proyectoRoutes);   // incluye también /:id/documentos
app.use("/api/mensajes", mensajeRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/cambios", cambioProyectoRoutes);
app.use("/api/archivos", uploadRoutes);
app.use("/api", proyectoDocumentosRoutes);

// Socket.IO
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);

  socket.on("nuevo-mensaje", (msg) => {
    io.emit("mensaje-actualizado", msg);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
