// routes/notificacionRoutes.js
const express = require("express");
const {
  listarNotificaciones,
  contarNotificaciones,
  marcarLeidaYEliminar,
  marcarTodasLeidasYEliminar,
} = require("../controllers/notificacionController");
const router = express.Router();

router.get("/", listarNotificaciones);
router.get("/counts", contarNotificaciones);
router.patch("/:id/read", marcarLeidaYEliminar);
router.patch("/read-all", marcarTodasLeidasYEliminar);

module.exports = router;
