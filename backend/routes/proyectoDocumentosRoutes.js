const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const { upload, handleMulterError } = require("../middlewares/upload");
const ctrl = require("../controllers/proyectoDocumentosController");

// Listar documentos del proyecto
router.get("/proyectos/:id/documentos", auth, ctrl.listByProyecto);

// Subir y registrar en Mongo
router.post(
  "/proyectos/:id/documentos",
  auth,
  upload.single("archivo"),
  ctrl.uploadDocumento,
  handleMulterError
);

// (Opcional) borrar
router.delete("/proyectos/:id/documentos/:publicId", auth, ctrl.deleteDocumento);

module.exports = router;
