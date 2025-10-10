const express = require("express");
const router = express.Router();
const Mensaje = require("../models/Mensaje");

// Rutas temporales o de prueba
router.get("/", async (req, res) => {
  try {
    const mensajes = await Mensaje.find();
    res.json(mensajes);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener mensajes", error });
  }
});

module.exports = router;
