const express = require("express");
const router = express.Router();
const Proyecto = require("../models/Proyecto");

// Obtener todos los proyectos
router.get("/", async (req, res) => {
  try {
    // Populate para mostrar nombres, email y estado del usuario
    const proyectos = await Proyecto.find()
      .populate("participantes.usuario_id", "nombres email estado");
    res.json(proyectos);
  } catch (error) {
    console.error("Error al obtener proyectos:", error);
    res.status(500).json({ mensaje: "Error al obtener proyectos" });
  }
});

// Insertar un nuevo proyecto
router.post("/", async (req, res) => {
  try {
    const nuevoProyecto = new Proyecto(req.body);
    const proyectoGuardado = await nuevoProyecto.save();
    // Devuelve el proyecto ya populado
    const proyectoCompleto = await Proyecto.findById(proyectoGuardado._id)
      .populate("participantes.usuario_id", "nombres email estado");
    res.status(201).json(proyectoCompleto);
  } catch (error) {
    console.error("Error al crear proyecto:", error);
    res.status(400).json({ mensaje: "Error al crear proyecto", error });
  }
});

// Obtener proyecto por ID
router.get("/:id", async (req, res) => {
  try {
    const proyecto = await Proyecto.findById(req.params.id)
      .populate("participantes.usuario_id", "nombres email estado");
    if (!proyecto) {
      return res.status(404).json({ mensaje: "Proyecto no encontrado" });
    }
    res.json(proyecto);
  } catch (error) {
    console.error("Error al obtener proyecto:", error);
    res.status(500).json({ mensaje: "Error al obtener proyecto" });
  }
});

// Actualizar proyecto por ID
router.put("/:id", async (req, res) => {
  try {
    const proyectoActualizado = await Proyecto.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("participantes.usuario_id", "nombres email estado");

    if (!proyectoActualizado) {
      return res.status(404).json({ mensaje: "Proyecto no encontrado" });
    }

    res.json({
      mensaje: "Proyecto actualizado correctamente",
      proyecto: proyectoActualizado,
    });
  } catch (error) {
    console.error("Error al actualizar proyecto:", error);
    res.status(500).json({ mensaje: "Error al actualizar proyecto" });
  }
});

module.exports = router;
