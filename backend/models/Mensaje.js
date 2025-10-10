import mongoose from "mongoose";

const archivoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  tipo: { type: String, enum: ["imagen", "pdf", "docx"], required: true },
  nombre: { type: String },
  tamaño: { type: Number }
});

const mensajeSchema = new mongoose.Schema({
  id_proyecto: { type: mongoose.Schema.Types.ObjectId, ref: "Proyecto", required: true },
  autor_id: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  contenido: { type: String, required: true },
  fecha_envio: { type: Date, default: Date.now },
  archivos: [archivoSchema]
});

const Mensaje = mongoose.model("Mensaje", mensajeSchema);
export default Mensaje;