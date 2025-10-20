const express = require("express");
const router = express.Router();
const {
  registrarUsuario,
  loginUsuario,
  obtenerUsuario,
  actualizarUsuario,
  eliminarUsuario
} = require("../controllers/usuarioController");


// CRUD adicional
router.get("/:usuario_sistema", obtenerUsuario);
router.post("/login", loginUsuario);
router.post("/", registrarUsuario);
router.put("/:usuario_sistema", actualizarUsuario);
router.delete("/:usuario_sistema", eliminarUsuario);

module.exports = router;
