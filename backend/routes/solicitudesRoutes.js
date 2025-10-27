const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/solicitudesController");
const auth = require("../middlewares/authMiddleware");

// Aplica auth a todas las rutas de solicitudes
router.use(auth);

router.get("/bloqueo/:proyectoId", ctrl.bloqueoProyecto);
router.post("/", ctrl.crear);
router.get("/", ctrl.listar);
router.get("/mias", ctrl.listarMias);
router.get("/:id", ctrl.obtenerUna);
router.post("/:id/aprobar", ctrl.aprobar);
router.post("/:id/rechazar", ctrl.rechazar);
router.post("/:id/cancelar", ctrl.cancelar);

module.exports = router;

