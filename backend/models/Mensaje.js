const mongoose = require("mongoose");

const archivoSchema = new mongoose.Schema({
  public_id: { type: String, required: true }, // ✅ ahora obligatorio, Cloudinary siempre lo devuelve
  url: { type: String, required: true },
  tipo: {
    type: String,
    enum: ["imagen", "pdf", "docx", "otros"], // ✅ más flexible
    default: "otros",
  },
  nombre: { type: String },
  tamaño: { type: Number },
});

const mensajeSchema = new mongoose.Schema({
  id_proyecto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Proyecto",
    required: true,
  },
  autor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
  },
  contenido: {
    type: String,
    default: "",
  },
  fecha_envio: {
    type: Date,
    default: Date.now,
  },
  archivos: [archivoSchema],
});

// 🚨 Validación: impedir mensajes totalmente vacíos
mensajeSchema.pre("validate", function (next) {
  if (!this.contenido?.trim() && (!this.archivos || this.archivos.length === 0)) {
    return next(new Error("El mensaje no puede estar vacío"));
  }
  next();
});

module.exports = mongoose.model("Mensaje", mensajeSchema);
