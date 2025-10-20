const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
  nombres: { type: String, required: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, maxlength: 120 },
  telefono: { type: String, required: true, unique: true, minlength: 8, maxlength: 20 },
  hash_password: { type: String, maxlength: 100 },
  estado: { type: String, enum: ["activo", "inactivo"], default: "activo" },
  roles: {
    type: [String],
    enum: ["administrador", "titular", "colaborador", "cliente"],
    default: ["cliente"]
  },
  usuario_sistema: { type: String, unique: true, required: true, minlength: 3, maxlength: 50 },
  fecha_registro: { type: Date, default: Date.now }
});

const Usuario = mongoose.model("Usuario", UsuarioSchema);

module.exports = Usuario;


