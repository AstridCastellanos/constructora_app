const express = require("express");
const router = express.Router();
const {
  registrarUsuario,
  loginUsuario,
  obtenerUsuario,
  actualizarUsuario,
  eliminarUsuario,
  obtenerUsuarios,
  obtenerClientes,
  obtenerResponsables
} = require("../controllers/usuarioController");

router.get("/", obtenerUsuarios); // Obtener todos los usuarios
router.get("/clientes", obtenerClientes); // Solo clientes
router.get("/responsables", obtenerResponsables); // Solo responsables

// CRUD adicional
router.get("/:usuario_sistema", obtenerUsuario);
router.post("/login", loginUsuario);
router.post("/", registrarUsuario);
router.put("/:usuario_sistema", actualizarUsuario);
router.delete("/:usuario_sistema", eliminarUsuario);

module.exports = router;
