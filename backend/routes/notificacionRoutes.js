const express = require("express");
const {
  listarNotificaciones,
  contarNotificaciones,
  marcarLeidaYEliminar,
  marcarTodasLeidasYEliminar,
} = require("../controllers/notificacionController");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();

// Todas las rutas de notificaciones requieren token
router.use(auth);

// Listar notificaciones del usuario autenticado
router.get("/", listarNotificaciones);

// Contadores para el badge
router.get("/counts", contarNotificaciones);

// Marcar una como leída y eliminar
router.patch("/:id/read", marcarLeidaYEliminar);

// Marcar todas como leídas y eliminar
router.patch("/read-all", marcarTodasLeidasYEliminar);

module.exports = router;
