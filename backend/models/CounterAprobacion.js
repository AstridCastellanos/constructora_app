// Genera secuencias tipo S-0001, S-0002... (exclusivo para solicitudes de aprobación)
const mongoose = require("mongoose");

const counterAprobacionSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // p.ej. 'solicitud_aprobacion'
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("CounterAprobacion", counterAprobacionSchema);
