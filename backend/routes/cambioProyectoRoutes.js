const express = require("express");
const router = express.Router();
const CambioProyecto = require("../models/CambioProyecto");
const Proyecto = require("../models/Proyecto");
const authMiddleware = require("../middlewares/authMiddleware");

// 📋 Obtener todos los cambios de proyecto
router.get("/", authMiddleware, async (req, res) => {
  try {
    const cambios = await CambioProyecto.find()
      .populate("id_proyecto", "codigo_proyecto nombre")
      .populate("id_solicitante", "nombre")
      .sort({ fecha_solicitud: -1 });

    const data = cambios.map((c) => ({
      _id: c._id,
      codigoProyecto: c.id_proyecto?.codigo_proyecto || "—",
      proyecto: c.id_proyecto?.nombre || "Sin nombre",
      solicitante: c.id_solicitante?.nombre || "—",
      descripcion: c.descripcion,
      estado: c.estado,
      fecha_solicitud: c.fecha_solicitud
        ? new Date(c.fecha_solicitud).toLocaleDateString()
        : "—",
    }));

    res.json(data);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener cambios de proyecto", error });
  }
});

// 🆕 Crear un nuevo cambio de proyecto
router.post("/", authMiddleware, async (req, res) => {
  try {
    const nuevoCambio = new CambioProyecto({
      id_proyecto: req.body.id_proyecto,
      id_solicitante: req.user.id,
      descripcion: req.body.descripcion,
      requiere_aprobacion: req.body.requiere_aprobacion || false,
      estado: "pendiente",
      fecha_solicitud: new Date(),
    });

    const guardado = await nuevoCambio.save();
    res.status(201).json(guardado);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al crear cambio de proyecto", error });
  }
});

// ✅ Aprobar un cambio
router.put("/:id/aprobar", authMiddleware, async (req, res) => {
  try {
    const cambio = await CambioProyecto.findByIdAndUpdate(
      req.params.id,
      { estado: "aprobado" },
      { new: true }
    );
    res.json(cambio);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al aprobar cambio", error });
  }
});

// ❌ Rechazar un cambio
router.put("/:id/rechazar", authMiddleware, async (req, res) => {
  try {
    const cambio = await CambioProyecto.findByIdAndUpdate(
      req.params.id,
      { estado: "rechazado" },
      { new: true }
    );
    res.json(cambio);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al rechazar cambio", error });
  }
});

// 🗑️ Eliminar un cambio de proyecto
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await CambioProyecto.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Cambio eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar cambio", error });
  }
});

module.exports = router;
