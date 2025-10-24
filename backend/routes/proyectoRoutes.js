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
// Actualizar proyecto por ID (con incremento atómico de saldo_abonado)
router.put("/:id", async (req, res) => {
  try {
    const {
      descripcion,
      direccion,
      presupuesto_aprox,
      estado,
      participantes,
      saldo_a_abonar, // <- llega del frontend
    } = req.body;

    // 1) Construir $set con los campos que sí permitimos actualizar
    const setUpdate = {};
    if (typeof descripcion === "string") setUpdate.descripcion = descripcion.trim();
    if (typeof direccion === "string") setUpdate.direccion = direccion.trim();
    if (estado) setUpdate.estado = estado;
    if (presupuesto_aprox !== undefined && presupuesto_aprox !== null) {
      const p = Number(presupuesto_aprox);
      if (!Number.isFinite(p) || p <= 0) {
        return res.status(400).json({ mensaje: "Presupuesto inválido" });
      }
      setUpdate.presupuesto_aprox = p;
    }
    if (Array.isArray(participantes)) {
      // Opcional: podrías validar estructura [{usuario_id, tipo_participante}]
      setUpdate.participantes = participantes;
    }

    // 2) Construir $inc si corresponde (monto positivo)
    const incUpdate = {};
    if (saldo_a_abonar !== undefined && saldo_a_abonar !== null) {
      const monto = Number(saldo_a_abonar);
      if (!Number.isFinite(monto) || monto < 0) {
        return res.status(400).json({ mensaje: "Saldo a abonar inválido" });
      }
      if (monto > 0) {
        incUpdate.saldo_abonado = monto;
      }
    }

    // 3) Unir update final (evita enviar operadores vacíos)
    const update = {};
    if (Object.keys(setUpdate).length) update.$set = setUpdate;
    if (Object.keys(incUpdate).length) update.$inc = incUpdate;

    // Si no hay nada que actualizar, avisar
    if (!Object.keys(update).length) {
      return res.status(400).json({ mensaje: "No hay cambios para aplicar" });
    }

    const proyectoActualizado = await Proyecto.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).populate("participantes.usuario_id", "nombres email estado");

    if (!proyectoActualizado) {
      return res.status(404).json({ mensaje: "Proyecto no encontrado" });
    }

    // Respuesta consistente para el frontend
    return res.json({
      mensaje: "Proyecto actualizado correctamente",
      proyecto: proyectoActualizado,
      saldo_abonado: proyectoActualizado.saldo_abonado, // útil si quieres leerlo directo
    });
  } catch (error) {
    console.error("Error al actualizar proyecto:", error);
    return res.status(500).json({ mensaje: "Error al actualizar proyecto" });
  }
});

module.exports = router;
