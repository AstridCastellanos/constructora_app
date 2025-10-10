const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
  nombres: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  telefono: { type: String, unique: true, required: true },
  hash_password: { type: String, required: true },
  estado: { type: String, enum: ["activo", "inactivo"], default: "activo" },
  roles: {
    type: [String],
    enum: ["admin", "titular", "colaborador", "cliente"],
    default: ["cliente"]
  },
  usuario_sistema: { type: String, unique: true, required: true },
  fecha_registro: { type: Date, default: Date.now }
});

const Usuario = mongoose.model("Usuario", UsuarioSchema);

module.exports = Usuario;
