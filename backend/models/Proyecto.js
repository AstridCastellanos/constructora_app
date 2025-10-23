const mongoose = require("mongoose");

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
  },
  descripcion: String,
  direccion: String,
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
  participantes: [participanteSchema],
  fecha_creacion: {
    type: Date,
    default: Date.now,
  },
});

// Calcular saldo pendiente automáticamente
proyectoSchema.pre("save", function (next) {
  this.saldo_pendiente = this.presupuesto_aprox - this.saldo_abonado;
  next();
});

// Generar automáticamente un código correlativo tipo P-0001
proyectoSchema.pre("save", async function (next) {
  if (this.isNew && !this.codigo_proyecto) {
    try {
      const ultimoProyecto = await mongoose
        .model("Proyecto")
        .findOne()
        .sort({ _id: -1 });

      let nuevoCodigo = "P-0001";

      if (ultimoProyecto && ultimoProyecto.codigo_proyecto) {
        const numero =
          parseInt(ultimoProyecto.codigo_proyecto.replace("P-", "")) + 1;
        nuevoCodigo = `P-${numero.toString().padStart(4, "0")}`;
      }

      this.codigo_proyecto = nuevoCodigo;
      next();
    } catch (error) {
      console.error("Error generando código de proyecto:", error);
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("Proyecto", proyectoSchema);
