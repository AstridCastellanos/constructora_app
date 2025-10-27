const mongoose = require("mongoose");
const { Schema } = mongoose;

const abonoSchema = new Schema({
  proyectoId: { type: Schema.Types.ObjectId, ref: "Proyecto", required: true },
  monto: { type: Number, required: true },
  metodo: { type: String },
  nota: { type: String },
  evidenciaUrl: { type: String },

  solicitadoPorId: { type: Schema.Types.ObjectId, ref: "Usario", required: true },
  aprobadoPorId: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },

  solicitadoEn: { type: Date, required: true },
  aprobadoEn: { type: Date, default: Date.now },

  solicitudId: { type: Schema.Types.ObjectId, ref: "SolicitudAprobacion", unique: true, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Abono", abonoSchema);
