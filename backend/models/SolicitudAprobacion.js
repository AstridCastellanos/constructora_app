const mongoose = require("mongoose");
const { Schema } = mongoose;

const solicitudAprobacionSchema = new Schema({
  codigo: { type: String, index: true }, // "S-0001"
  proyectoId: { type: Schema.Types.ObjectId, ref: "Proyecto", required: true },
  tipo: { type: String, enum: ["ABONO", "CAMBIO_ESTADO"], required: true },
  estado: {
    type: String,
    enum: ["PENDIENTE", "APROBADA", "RECHAZADA", "CANCELADA", "CONFLICTO"],
    default: "PENDIENTE"
  },

  solicitanteId: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
  solicitadaEn: { type: Date, default: Date.now },

  decididaPorId: { type: Schema.Types.ObjectId, ref: "Usuario" },
  decididaEn: { type: Date },
  comentarioDecision: { type: String },

  // Rev del proyecto al momento de crear la solicitud (para cambios de estado)
  revProyectoBase: { type: Number },

  payload: {
    abono: {
      monto: Number,
      metodo: String,
      nota: String,
      evidenciaUrl: String,
    },
    cambioEstado: {
      nuevoEstado: { type: String, enum: ["Finalizado", "Cancelado"] },
      motivo: String,
    }
  },

  diffs: [{ campo: String, de: Schema.Types.Mixed, a: Schema.Types.Mixed }],

  historial: [{
    en: { type: Date, default: Date.now },
    accion: { type: String, enum: ["CREADA", "APROBADA", "RECHAZADA", "CANCELADA", "CONFLICTO"] },
    por: { type: Schema.Types.ObjectId, ref: "User" },
    nota: String
  }]
}, { timestamps: true });

module.exports = mongoose.model("SolicitudAprobacion", solicitudAprobacionSchema);
