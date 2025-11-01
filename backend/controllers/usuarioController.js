const Usuario = require("../models/Usuario");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTRAR USUARIO
exports.registrarUsuario = async (req, res) => {
  
  try {
    const { nombres, email, telefono, password, roles, usuario_sistema } = req.body;
    

    // Validar campos obligatorios
    if (!nombres || !email || !telefono || !usuario_sistema) {
      return res.status(400).json({ mensaje: "Todos los campos son obligatorios." });
    }

    // Validar contraseña
    if (!password || password.trim() === "") {
      return res.status(400).json({ mensaje: "Debe proporcionar una contraseña." });
    }

    // Verificar duplicados
    const existeEmail = await Usuario.findOne({ email });
    if (existeEmail)
      return res.status(400).json({ mensaje: "El correo ya está registrado." });

    const existeTelefono = await Usuario.findOne({ telefono });
    if (existeTelefono)
      return res.status(400).json({ mensaje: "El teléfono ya está registrado." });

    const existeUsuario = await Usuario.findOne({ usuario_sistema });
    if (existeUsuario)
      return res.status(400).json({ mensaje: "El usuario del sistema ya existe." });

    // Validar roles incompatibles
    if (roles && roles.includes("cliente") && roles.length > 1) {
      return res.status(400).json({
        mensaje: "Un usuario con rol 'cliente' no puede tener otros roles asignados."
      });
    }

    // Generar hash
    const hash_password = await bcrypt.hash(password, 10);

    // Crear usuario nuevo
    const nuevoUsuario = new Usuario({
      nombres,
      email,
      telefono,
      hash_password,
      roles: roles && roles.length ? roles : ["cliente"],
      usuario_sistema,
    });

    await nuevoUsuario.save();

    return res.status(201).json({
      mensaje: "Usuario creado correctamente",
      usuario: {
        id: nuevoUsuario._id,
        nombres: nuevoUsuario.nombres,
        email: nuevoUsuario.email,
        telefono: nuevoUsuario.telefono,
        roles: nuevoUsuario.roles,
        usuario_sistema: nuevoUsuario.usuario_sistema,
        fecha_registro: nuevoUsuario.fecha_registro,
      },
    });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al registrar el usuario.", error: error.message });
  }
};

// LOGIN DE USUARIO 
exports.loginUsuario = async (req, res) => {
  try {
    const { identificador, password } = req.body;

    // Validar campos obligatorios
    if (!identificador || !password) {
      return res.status(400).json({ mensaje: "Debe ingresar usuario y contraseña." });
    }

    // Buscar usuario por su nombre de usuario
    const usuario = await Usuario.findOne({ usuario_sistema: identificador });

    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado." });

    // Validar estado del usuario
    if (usuario.estado !== "activo") {
      return res.status(403).json({
        mensaje: "El usuario está inactivo. Contacte al administrador para reactivar su cuenta."
      });
    }

    // Validar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.hash_password);
    if (!passwordValida)
      return res.status(401).json({ mensaje: "Contraseña incorrecta." });

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario._id, roles: usuario.roles },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    // Respuesta exitosa
    return res.status(200).json({
      mensaje: "Inicio de sesión exitoso.",
      token,
      usuario: {
        id: usuario._id,
        nombres: usuario.nombres,
        email: usuario.email,
        telefono: usuario.telefono,
        roles: usuario.roles,
        usuario_sistema: usuario.usuario_sistema,
        estado: usuario.estado,
      },
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al iniciar sesión.",
      error: error.message,
    });
  }
};

// OBTENER USUARIO POR usuario_sistema
exports.obtenerUsuario = async (req, res) => {
  try {
    const { usuario_sistema } = req.params;
    const usuario = await Usuario.findOne({ usuario_sistema });

    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al buscar usuario" });
  }
};

// ACTUALIZAR USUARIO
exports.actualizarUsuario = async (req, res) => {
  try {
    const { usuario_sistema } = req.params;
    const { nombres, email, telefono, roles, estado, password } = req.body;

    // Verificar existencia del usuario
    const usuario = await Usuario.findOne({ usuario_sistema });
    if (!usuario)
      return res.status(404).json({ mensaje: "Usuario no encontrado." });

    // Validar campos obligatorios
    if (!nombres || !email || !telefono) {
      return res.status(400).json({ mensaje: "Todos los campos son obligatorios." });
    }

    // Verificar duplicado de correo (excluyendo al mismo usuario)
    const existeEmail = await Usuario.findOne({
      email,
      _id: { $ne: usuario._id },
    });
    if (existeEmail)
      return res.status(400).json({ mensaje: "El correo ya está registrado." });

    // Verificar duplicado de teléfono (excluyendo al mismo usuario)
    const existeTelefono = await Usuario.findOne({
      telefono,
      _id: { $ne: usuario._id },
    });
    if (existeTelefono)
      return res.status(400).json({ mensaje: "El teléfono ya está registrado." });

    // Validar roles incompatibles
    if (roles && roles.includes("cliente") && roles.length > 1) {
      return res.status(400).json({
        mensaje: "Un usuario con rol 'cliente' no puede tener otros roles asignados.",
      });
    }

    // Validar longitud de contraseña si se envía una nueva
    if (password && password.trim() !== "") {
      if (password.length < 10) {
        return res
          .status(400)
          .json({ mensaje: "La nueva contraseña debe tener al menos 10 caracteres." });
      }
      const nuevaHash = await bcrypt.hash(password, 10);
      usuario.hash_password = nuevaHash;
    }

    // Actualizar campos permitidos
    usuario.nombres = nombres;
    usuario.email = email;
    usuario.telefono = telefono;
    usuario.estado = estado;
    usuario.roles = roles;

    await usuario.save();

    return res.status(200).json({
      mensaje: "Usuario actualizado correctamente",
      usuario: {
        id: usuario._id,
        nombres: usuario.nombres,
        email: usuario.email,
        telefono: usuario.telefono,
        roles: usuario.roles,
        usuario_sistema: usuario.usuario_sistema,
        fecha_registro: usuario.fecha_registro,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al actualizar el usuario.", error: error.message });
  }
};

// ELIMINAR USUARIO
exports.eliminarUsuario = async (req, res) => {
  try {
    const { usuario_sistema } = req.params;

    const eliminado = await Usuario.findOneAndDelete({ usuario_sistema });
    if (!eliminado)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    res.status(200).json({ mensaje: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar usuario" });
  }
};

// OBTENER TODOS LOS USUARIOS
exports.obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find({}, "nombres email telefono roles estado");
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener usuarios" });
  }
};

// OBTENER USUARIOS CON ROL 'CLIENTE'
exports.obtenerClientes = async (req, res) => {
  try {
    const clientes = await Usuario.find(
      { roles: { $in: ["cliente"] }, estado: "activo" },
      "nombres email telefono roles estado"
    );
    res.status(200).json(clientes);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener clientes" });
  }
};

// OBTENER USUARIOS QUE PUEDEN SER RESPONSABLES
exports.obtenerResponsables = async (req, res) => {
  try {
    // Buscar usuarios activos que no sean solo clientes
    const responsables = await Usuario.find(
      {
        estado: "activo",
        roles: { $ne: ["cliente"] } 
      },
      "nombres email telefono roles estado"
    );

    // Filtrado adicional en memoria
    const filtrados = responsables.filter((u) => {
      
      if (u.roles.includes("cliente")) return false;

      if (!u.roles.includes("administrador")) return true;

      const otros = u.roles.filter((r) => r !== "administrador");
      return otros.length > 0;
    });

    res.status(200).json(filtrados);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener responsables" });
  }
};

