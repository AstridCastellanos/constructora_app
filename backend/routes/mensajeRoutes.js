const express = require("express");
const router = express.Router();

const {
  crearMensaje,
  listarMensajes,
  listarMensajesPorProyecto,
} = require("../controllers/mensajeController");

const { descargarOAbrirArchivo } = require("../controllers/archivoController");
router.use((req, _res, next) => {
  console.log("[mensajeroutes]", req.method, req.originalUrl);
  next();
});

// Chat: crear y listar
router.post("/", crearMensaje);
router.get("/", listarMensajes);
router.get("/proyecto/:id_proyecto", listarMensajesPorProyecto);

// Descarga/visualización centralizada (chat + documentos de proyecto)
router.get(/^\/archivo\/(.+)$/, descargarOAbrirArchivo);

module.exports = router;
