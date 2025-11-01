const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const { upload, handleMulterError } = require("../middlewares/upload");
const proyectoCtrl = require("../controllers/proyectoController");
const docCtrl = require("../controllers/proyectoDocumentosController");

// Proyectos
router.get("/", auth, proyectoCtrl.getProyectos);

router.post("/", auth, proyectoCtrl.createProyecto);     
router.get("/:id", auth, proyectoCtrl.getProyectoById);  
router.put("/:id", auth, proyectoCtrl.updateProyecto);   

// Documentos
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
