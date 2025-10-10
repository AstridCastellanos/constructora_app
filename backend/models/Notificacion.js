import mongoose from "mongoose";

const notificacionSchema = new mongoose.Schema({
  id_usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  id_proyecto: { type: mongoose.Schema.Types.ObjectId, ref: "Proyecto" },
  tipo: { type: String, required: true }, // "nuevo_mensaje", "aprobacion", "cambio", etc.
  mensaje: { type: String, required: true },
  leida: { type: Boolean, default: false },
  fecha_creacion: { type: Date, default: Date.now }
});

const Notificacion = mongoose.model("Notificacion", notificacionSchema);
export default Notificacion;
