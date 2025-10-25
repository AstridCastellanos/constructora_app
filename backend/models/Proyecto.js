const mongoose = require("mongoose");
const Counter = require("./Counter");

const participanteSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
  },
  tipo_participante: {
    type: String,
    enum: ["cliente", "responsable"],
    required: true,
  },
  observaciones: String,
});

const proyectoSchema = new mongoose.Schema({
  codigo_proyecto: {
    type: String,
    unique: true, 
  },
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  descripcion: String,
  direccion: String,
  presupuesto_aprox: {
    type: Number,
    required: true,
    min: [0, "El presupuesto debe ser mayor o igual a 0"],
  },
  saldo_abonado: {
    type: Number,
    default: 0,
    min: [0, "El saldo abonado no puede ser negativo"],
  },
  saldo_pendiente: {
    type: Number,
    default: function () {
      // se recalcula en hooks también
      return (this.presupuesto_aprox || 0) - (this.saldo_abonado || 0);
    },
  },
  fecha_inicio: {
    type: Date,
    default: Date.now,
  },
  estado: {
    type: String,
    enum: ["En Curso", "Finalizado", "Pausado", "Cancelado"],
    default: "En Curso",
  },
  participantes: [participanteSchema],
  fecha_creacion: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Calcular saldo_pendiente automáticamente al guardar documento nuevo o existente
proyectoSchema.pre("save", function (next) {
  this.saldo_pendiente = (this.presupuesto_aprox || 0) - (this.saldo_abonado || 0);
  next();
});

// También recalcular cuando actualizas vía findOneAndUpdate/ findByIdAndUpdate
proyectoSchema.pre(["findOneAndUpdate", "findByIdAndUpdate"], function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || {};
  const $inc = update.$inc || {};

  next();
});

// Generar automáticamente un código correlativo tipo P-0001, P-0002, ... de forma atómica
proyectoSchema.pre("validate", async function (next) {
  if (!this.isNew || this.codigo_proyecto) return next();
  try {
    const c = await Counter.findOneAndUpdate(
      { _id: "proyecto" },        
      { $inc: { seq: 1 } },       
      { new: true, upsert: true } 
    );

    const n = c.seq;

    this.codigo_proyecto = `P-${String(n).padStart(4, "0")}`;
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Proyecto", proyectoSchema);
