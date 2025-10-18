const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const usuarioRoutes = require("./routes/usuarioRoutes");
const proyectoRoutes = require("./routes/proyectoRoutes");
const mensajeRoutes = require("./routes/mensajeRoutes");
const notificacionRoutes = require("./routes/notificacionRoutes");
const cambioProyectoRoutes = require("./routes/cambioProyectoRoutes");
const uploadRoutes = require("./routes/uploadRoutes");


const app = express();
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error al conectar MongoDB:", err));

// Rutas
app.use("/api/usuarios", usuarioRoutes);

const protegidaRoutes = require("./routes/protegidaRoutes");

app.use("/api/protegida", protegidaRoutes);
app.use("/api/proyectos", proyectoRoutes);
app.use("/api/mensajes", mensajeRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/cambios", cambioProyectoRoutes);
app.use("/api/archivos", uploadRoutes);


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));


