const Proyecto = require("../models/Proyecto");
const SolicitudAprobacion = require("../models/SolicitudAprobacion");

// Obtener todos los proyectos
async function getProyectos(req, res) {
  try {
    const { scope } = req.query;

    // Si no es para la vista de chat, responde todo como normal
    if (scope !== "chat") {
      const proyectos = await Proyecto.find()
        .populate("participantes.usuario_id", "nombres email estado");
      return res.json(proyectos);
    }

    // Filtrado para la vista de chat
    const usuario = req.usuario; 
    const roles = Array.isArray(usuario.roles) ? usuario.roles : [];
    const esTitular = roles.includes("titular");
    const esColaborador = roles.includes("colaborador");
    const esCliente = roles.includes("cliente");
    const esSoloAdmin = roles.includes("administrador") && !esTitular && !esColaborador && !esCliente;

    if (esSoloAdmin) {
      return res.status(403).json({ mensaje: "Sin acceso a la vista de chats." });
    }

    let filtro = {};
    if (esTitular) {
      // titular ve todos
      filtro = {};
    } else if (esColaborador || esCliente) {
      // colaboradores/clientes ven solo proyectos donde participan
      const userId = usuario._id || usuario.id || usuario.usuario_id;
      filtro = { "participantes.usuario_id": userId };
    } else {
      return res.status(403).json({ mensaje: "Rol sin acceso a chats." });
    }

    const proyectos = await Proyecto.find(filtro)
      .populate("participantes.usuario_id", "nombres email estado");

    return res.json(proyectos);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener proyectos" });
  }
}

// Insertar un nuevo proyecto
async function createProyecto(req, res) {
  try {
    const nuevoProyecto = new Proyecto(req.body);
    const proyectoGuardado = await nuevoProyecto.save();
    const proyectoCompleto = await Proyecto.findById(proyectoGuardado._id)
      .populate("participantes.usuario_id", "nombres email estado");
    res.status(201).json(proyectoCompleto);
  } catch (error) {
    res.status(400).json({ mensaje: "Error al crear proyecto", error });
  }
}

// Obtener proyecto por ID
async function getProyectoById(req, res) {
  try {
    const proyecto = await Proyecto.findById(req.params.id)
      .populate("participantes.usuario_id", "nombres email estado");
    if (!proyecto) {
      return res.status(404).json({ mensaje: "Proyecto no encontrado" });
    }
    res.json(proyecto);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener proyecto" });
  }
}

// Actualizar proyecto por ID 
async function updateProyecto(req, res) {
  try {
    // Cargar proyecto actual y validar estado de cierre/bloqueo
    const actual = await Proyecto.findById(req.params.id);
    if (!actual) {
      return res.status(404).json({ mensaje: "Proyecto no encontrado" });
    }

    // Si ya quedó Finalizado/Cancelado, no permitir edición
    if (["Finalizado", "Cancelado"].includes(actual.estado)) {
      return res.status(423).json({ mensaje: `Proyecto ${actual.estado}. Edición bloqueada.` });
    }

    // Si hay solicitud PENDIENTE para cambiar a Finalizado/Cancelado, bloquear edición
    const solPend = await SolicitudAprobacion.findOne({
      proyectoId: actual._id,
      tipo: "CAMBIO_ESTADO",
      estado: "PENDIENTE",
      "payload.cambioEstado.nuevoEstado": { $in: ["Finalizado", "Cancelado"] },
    }).select("_id codigo");
    if (solPend) {
      return res.status(423).json({ mensaje: `Edición bloqueada por solicitud ${solPend.codigo || solPend._id}.` });
    }

    // Procesar payload de actualización 
    const {
      descripcion,
      direccion,
      presupuesto_aprox,
      estado,
      participantes,
      saldo_a_abonar, 
    } = req.body;

    if (saldo_a_abonar !== undefined && saldo_a_abonar !== null) {
      const monto = Number(saldo_a_abonar);
      if (Number.isFinite(monto) && monto > 0) {
        return res.status(400).json({ mensaje: "Los abonos se realizan mediante solicitudes de aprobación." });
      }
    }

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
      setUpdate.participantes = participantes;
    }

    const update = {};
    if (Object.keys(setUpdate).length) update.$set = setUpdate;

    if (!Object.keys(update).length) {
      return res.status(400).json({ mensaje: "No hay cambios para aplicar" });
    }

    // 3) Aplicar cambios
    const proyectoActualizado = await Proyecto.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).populate("participantes.usuario_id", "nombres email estado");

    if (!proyectoActualizado) {
      return res.status(404).json({ mensaje: "Proyecto no encontrado" });
    }

    return res.json({
      mensaje: "Proyecto actualizado correctamente",
      proyecto: proyectoActualizado,
      saldo_abonado: proyectoActualizado.saldo_abonado,
    });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al actualizar proyecto" });
  }
}


// Listar documentos del proyecto
async function listDocumentos(req, res) {
  try {
    const proyecto = await Proyecto.findById(req.params.id).lean();
    if (!proyecto) return res.status(404).json({ mensaje: "Proyecto no encontrado" });

    const docs = Array.isArray(proyecto.documentos) ? proyecto.documentos : [];
    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ mensaje: "Error al listar documentos" });
  }
}

// Subir documento al proyecto
async function uploadDocumento(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ mensaje: "No se envió archivo." });
    }
    // Simulación de resultado:
    const { originalname, mimetype, size } = req.file;
    const nuevoDoc = {
      public_id: `local_${Date.now()}`,
      nombre: originalname,
      url: `/archivos/${Date.now()}_${originalname}`,
      tipo: mimetype,
      tamaño: size,
    };

    const proyecto = await Proyecto.findById(req.params.id);
    if (!proyecto) return res.status(404).json({ mensaje: "Proyecto no encontrado" });

    if (!Array.isArray(proyecto.documentos)) proyecto.documentos = [];
    proyecto.documentos.push(nuevoDoc);

    await proyecto.save();
    return res.status(201).json(nuevoDoc);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getProyectos,
  createProyecto,
  getProyectoById,
  updateProyecto,
  listDocumentos,
  uploadDocumento,
};
