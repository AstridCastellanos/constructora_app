const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");

// Ruta protegida de prueba
router.get("/perfil", auth, (req, res) => {
  res.json({
    mensaje: "Acceso autorizado",
    usuario: req.usuario
  });
});

module.exports = router;
