const express = require("express");
const router = express.Router();
const Notificacion = require("../models/Notificacion");
const authMiddleware = require("../middlewares/authMiddleware");

// 📬 Obtener todas las notificaciones del usuario logueado
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notificaciones = await Notificacion.find({ id_usuario: req.user.id })
      .populate("id_proyecto", "nombre codigo_proyecto")
      .sort({ fecha_creacion: -1 });

    res.json(notificaciones);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener notificaciones", error });
  }
});

// 🆕 Crear una notificación
router.post("/", authMiddleware, async (req, res) => {
  try {
    const nuevaNotificacion = new Notificacion({
      ...req.body,
      fecha_creacion: new Date(),
      leida: false,
    });
    const guardada = await nuevaNotificacion.save();
    res.status(201).json(guardada);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al crear notificación", error });
  }
});

// 📘 Marcar como leída
router.put("/:id/leida", authMiddleware, async (req, res) => {
  try {
    const notificacion = await Notificacion.findByIdAndUpdate(
      req.params.id,
      { leida: true },
      { new: true }
    );
    res.json(notificacion);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar notificación", error });
  }
});

// 🗑️ Eliminar una notificación
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await Notificacion.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Notificación eliminada" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar notificación", error });
  }
});

module.exports = router;
