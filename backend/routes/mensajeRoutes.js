const express = require("express");
const router = express.Router();

const {
  crearMensaje,
  listarMensajes,
  listarMensajesPorProyecto,
} = require("../controllers/mensajeController");

const { descargarOAbrirArchivo } = require("../controllers/archivoController");

// Chat: crear y listar
router.post("/", crearMensaje);
router.get("/", listarMensajes);
router.get("/proyecto/:id_proyecto", listarMensajesPorProyecto);

// Descarga/visualización centralizada (chat + documentos de proyecto)
router.get(/^\/archivo\/(.+)$/, descargarOAbrirArchivo);

module.exports = router;
