const express = require("express");
const router = express.Router();
const Proyecto = require("../models/Proyecto");

// ✅ Obtener todos los proyectos
router.get("/", async (req, res) => {
  try {
    const proyectos = await Proyecto.find().populate("participantes.usuario_id", "nombres email");
    res.json(proyectos);
  } catch (error) {
    console.error("Error al obtener proyectos:", error);
    res.status(500).json({ mensaje: "Error al obtener proyectos" });
  }
});

// ✅ Insertar un nuevo proyecto
router.post("/", async (req, res) => {
  try {
    const nuevoProyecto = new Proyecto(req.body);
    const proyectoGuardado = await nuevoProyecto.save();
    res.status(201).json(proyectoGuardado);
  } catch (error) {
    console.error("Error al crear proyecto:", error);
    res.status(400).json({ mensaje: "Error al crear proyecto", error });
  }
});

// ✅ Obtener proyecto por ID
router.get("/", async (req, res) => {
  try {
    const proyectos = await Proyecto.find()
      .populate("participantes.usuario_id", "nombres estado"); 
    res.json(proyectos);
  } catch (error) {
    console.error("Error al obtener proyectos:", error);
    res.status(500).json({ mensaje: "Error al obtener proyectos" });
  }
});


module.exports = router;
