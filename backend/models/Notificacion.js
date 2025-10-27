const mongoose = require("mongoose");

const notificacionSchema = new mongoose.Schema({
  id_usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  id_proyecto: { type: mongoose.Schema.Types.ObjectId, ref: "Proyecto" },
  tipo: { 
    type: String, 
    required: true, 
    enum: ["chat_mensaje","aprobacion_solicitada","aprobacion_resuelta"] 
  },
  titulo: { type: String, required: true, maxlength: 120 },
  mensaje: { type: String, required: true, maxlength: 300 },
  fecha_creacion: { type: Date, default: Date.now }
}, { versionKey: false });

notificacionSchema.index({ id_usuario: 1, fecha_creacion: -1 });

module.exports = mongoose.model("Notificacion", notificacionSchema);