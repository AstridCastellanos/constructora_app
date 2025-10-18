const mongoose = require("mongoose");

const participanteSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario", // referencia a la colección de usuarios
  },
  rol_en_proyecto: {
    type: String,
    enum: ["arquitecto", "cliente", "supervisor", "colaborador", "otro"],
    default: "colaborador",
  },
});

const proyectoSchema = new mongoose.Schema({
  codigo_proyecto: {
    type: String,
    required: true,
    unique: true,
  },
  nombre: {
    type: String,
    required: true,
  },
  descripcion: {
    type: String,
  },
  direccion: {
    type: String,
  },
  presupuesto_aprox: {
    type: Number,
    required: true,
  },
  saldo_abonado: {
    type: Number,
    default: 0,
  },
  saldo_pendiente: {
    type: Number,
    default: function () {
      return this.presupuesto_aprox - this.saldo_abonado;
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
  fecha_creacion: {
    type: Date,
    default: Date.now,
  },
  participantes: [participanteSchema],
});

// Cálculo automático antes de guardar
proyectoSchema.pre("save", function (next) {
  this.saldo_pendiente = this.presupuesto_aprox - this.saldo_abonado;
  next();
});

module.exports = mongoose.model("Proyecto", proyectoSchema);
