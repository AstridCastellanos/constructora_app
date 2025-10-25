// routes/proyectoRoutes.js
const express = require("express");
const router = express.Router();

// Usa el nombre real del archivo:
const auth = require("../middlewares/authMiddleware");
const { upload, handleMulterError } = require("../middlewares/upload");

const proyectoCtrl = require("../controllers/proyectoController");
const docCtrl = require("../controllers/proyectoDocumentosController");

// Proyectos
// Proteger este GET porque getProyectos usa req.usuario cuando ?scope=chat
router.get("/", auth, proyectoCtrl.getProyectos);

router.post("/", auth, proyectoCtrl.createProyecto);     // opcional proteger
router.get("/:id", auth, proyectoCtrl.getProyectoById);  // opcional proteger
router.put("/:id", auth, proyectoCtrl.updateProyecto);   // opcional proteger

// Documentos (protegidas)
router.get("/:id/documentos", auth, docCtrl.listByProyecto);
router.post(
  "/:id/documentos",
  auth,
  upload.single("archivo"),
  docCtrl.uploadDocumento,
  handleMulterError
);
router.delete("/:id/documentos/:publicId", auth, docCtrl.deleteDocumento);

module.exports = router;
