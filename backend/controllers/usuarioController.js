const Usuario = require("../models/Usuario");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ========================================
// REGISTRAR USUARIO
// ========================================
exports.registrarUsuario = async (req, res) => {
  try {
    const { nombres, email, telefono, password, roles, usuario_sistema } = req.body;

    const existeEmail = await Usuario.findOne({ email });
    if (existeEmail) return res.status(400).json({ mensaje: "El correo ya está registrado." });

    const existeTelefono = await Usuario.findOne({ telefono });
    if (existeTelefono) return res.status(400).json({ mensaje: "El teléfono ya está registrado." });

    const hash_password = await bcrypt.hash(password, 10);

    const nuevoUsuario = new Usuario({
      nombres,
      email,
      telefono,
      hash_password,
      roles,
      usuario_sistema
    });

    await nuevoUsuario.save();

    res.status(201).json({
      mensaje: "✅ Usuario creado correctamente",
      usuario: {
        id: nuevoUsuario._id,
        nombres: nuevoUsuario.nombres,
        email: nuevoUsuario.email,
        telefono: nuevoUsuario.telefono,
        roles: nuevoUsuario.roles,
        usuario_sistema: nuevoUsuario.usuario_sistema,
        fecha_registro: nuevoUsuario.fecha_registro
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "❌ Error al registrar el usuario" });
  }
};

// ========================================
// LOGIN DE USUARIO (por email o teléfono)
// ========================================
exports.loginUsuario = async (req, res) => {
  try {
    const { identificador, password } = req.body; // 🔹 esta línea es la que falta

    const usuario = await Usuario.findOne({ usuario_sistema: identificador });

    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const passwordValida = await bcrypt.compare(password, usuario.hash_password);
    if (!passwordValida)
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    // Generar token
    const token = jwt.sign(
      { id: usuario._id, roles: usuario.roles },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    res.status(200).json({
      mensaje: "✅ Login exitoso",
      token,
      usuario: {
        id: usuario._id,
        nombres: usuario.nombres,
        email: usuario.email,
        telefono: usuario.telefono,
        roles: usuario.roles,
        usuario_sistema: usuario.usuario_sistema
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "❌ Error al iniciar sesión" });
  }
};

