const mongoose = require('mongoose');
const ProyectoDocumentoSchema = new mongoose.Schema({
  id_proyecto: { type: mongoose.Schema.Types.ObjectId, ref: 'Proyecto', required: true },
  public_id:   { type: String, required: true, unique: true },
  nombre:      { type: String, required: true },
  formato:     { type: String },
  url:         { type: String, required: true },
  tamaño:      { type: Number },
  creado_por:  { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  creado_en:   { type: Date, default: Date.now }
});
module.exports = mongoose.model('ProyectoDocumento', ProyectoDocumentoSchema);