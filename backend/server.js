const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Importar rutas
const usuarioRoutes = require("./routes/usuarioRoutes");
const proyectoRoutes = require("./routes/proyectoRoutes");
const mensajeRoutes = require("./routes/mensajeRoutes");
const notificacionRoutes = require("./routes/notificacionRoutes");
const cambioProyectoRoutes = require("./routes/cambioProyectoRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const protegidaRoutes = require("./routes/protegidaRoutes");

// Inicializar Express
const app = express();
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error al conectar MongoDB:", err));

// Crear servidor HTTP y configurar Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // ⚠️ En producción poner el dominio real
    methods: ["GET", "POST"],
  },
});

// Guardamos `io` dentro de `app` para usarlo en controladores
app.set("io", io);

// Rutas
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/protegida", protegidaRoutes);
app.use("/api/proyectos", proyectoRoutes);
app.use("/api/mensajes", mensajeRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/cambios", cambioProyectoRoutes);
app.use("/api/archivos", uploadRoutes);

// Evento de conexión WebSocket
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);

  // Reenviar a todos los clientes los mensajes nuevos enviados vía socket
  socket.on("nuevo-mensaje", (msg) => {
    io.emit("mensaje-actualizado", msg);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
