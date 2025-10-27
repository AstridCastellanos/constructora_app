const mongoose = require("mongoose");

// Modelos
const SolicitudAprobacion = require("../models/SolicitudAprobacion");
const Abono = require("../models/Abono");
const CounterAprobacion = require("../models/CounterAprobacion");
const Proyecto = require("../models/Proyecto");

// 🔔 Notificaciones (usar siempre el helper recomendado)
const { crearNotificacion } = require("./notificacionController");
// 👇 Helper para obtener titulares activos (lo estabas usando pero no estaba importado)
const { titularesActivosIds } = require("./_notif.helpers");

// Helpers de autenticación y roles
function getUsuario(req) {
  return req.usuario || req.user || null;
}
function getUsuarioId(u) {
  if (!u) return null;
  return u._id || u.id || u.usuario_id || u.uid || null;
}
function rolesDe(u) {
  return Array.isArray(u?.roles) ? u.roles : [];
}
function esTitular(u) { return rolesDe(u).includes("titular"); }
function esColaborador(u) { return rolesDe(u).includes("colaborador"); }

// Generar siguiente código S-0001
async function siguienteCodigoSolicitud() {
  const c = await CounterAprobacion.findOneAndUpdate(
    { _id: "solicitud_aprobacion" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const num = String(c.seq).padStart(4, "0");
  return `S-${num}`;
}

// ===================== Crear =====================
exports.crear = async (req, res) => {
  try {
    const usuario = getUsuario(req);
    const usuarioId = getUsuarioId(usuario);
    if (!usuarioId) return res.status(401).json({ mensaje: "No autenticado" });
    if (!(esTitular(usuario) || esColaborador(usuario))) {
      return res.status(403).json({ mensaje: "No autorizado para crear solicitudes" });
    }

    const { proyectoId, tipo, payload } = req.body;

    const proyecto = await Proyecto.findById(proyectoId);
    if (!proyecto) return res.status(404).json({ mensaje: "Proyecto no existe" });

    if (tipo === "ABONO") {
      const monto = Number(payload?.abono?.monto);
      if (!Number.isFinite(monto) || monto <= 0) {
        return res.status(400).json({ mensaje: "Monto inválido" });
      }
    } else if (tipo === "CAMBIO_ESTADO") {
      const nuevoEstado = payload?.cambioEstado?.nuevoEstado;
      if (!["Finalizado", "Cancelado"].includes(nuevoEstado)) {
        return res.status(400).json({ mensaje: "Estado inválido" });
      }
    } else {
      return res.status(400).json({ mensaje: "Tipo inválido" });
    }

    const codigo = await siguienteCodigoSolicitud();

    const doc = await SolicitudAprobacion.create({
      codigo,
      proyectoId,
      tipo,
      estado: "PENDIENTE",
      solicitanteId: usuarioId,
      solicitadaEn: new Date(),
      revProyectoBase: proyecto.rev || 1,
      payload,
      historial: [{ accion: "CREADA", por: usuarioId, en: new Date(), nota: "" }]
    });

    // 🔔 Notificar SOLO a titulares
    const titulares = await titularesActivosIds();
    await Promise.all(titulares.map(uid => crearNotificacion({
      id_usuario: uid,
      id_proyecto: proyectoId,
      tipo: "aprobacion_solicitada",
      titulo: "Nueva solicitud de aprobación",
      mensaje: `Solicitud ${doc.codigo} en proyecto ${proyecto.nombre || proyecto.codigo_proyecto || ""}.`,
    })));

    res.status(201).json(doc);
  } catch (err) {
    console.error("crear solicitud error:", err);
    res.status(500).json({ mensaje: "Error al crear solicitud" });
  }
};

// ===================== Listar =====================
exports.listar = async (req, res) => {
  try {
    const usuario = getUsuario(req);
    const usuarioId = getUsuarioId(usuario);
    if (!usuarioId) return res.status(401).json({ mensaje: "No autenticado" });

    const filtro = {};
    // Titular ve todas; otros solo las suyas
    if (!esTitular(usuario)) filtro.solicitanteId = usuarioId;

    const { estado, tipo, proyectoId, q } = req.query;
    if (estado) filtro.estado = estado;
    if (tipo) filtro.tipo = tipo;
    if (proyectoId) filtro.proyectoId = proyectoId;
    if (q) filtro.codigo = new RegExp(q, "i");

    const items = await SolicitudAprobacion.find(filtro)
      .sort({ createdAt: -1 })
      .populate("proyectoId", "nombre codigo_proyecto estado")
      .populate("solicitanteId", "usuario_sistema nombres email")
      .populate("decididaPorId", "usuario_sistema nombres email");

    res.json(items);
  } catch (err) {
    console.error("listar solicitudes error:", err);
    res.status(500).json({ mensaje: "Error al listar solicitudes" });
  }
};

// =============== Listar "mías" ===================
exports.listarMias = async (req, res) => {
  try {
    const usuario = getUsuario(req);
    const usuarioId = getUsuarioId(usuario);
    if (!usuarioId) return res.status(401).json({ mensaje: "No autenticado" });

    const items = await SolicitudAprobacion.find({ solicitanteId: usuarioId })
      .sort({ createdAt: -1 })
      .populate("proyectoId", "nombre codigo_proyecto estado")
      .populate("decididaPorId", "usuario_sistema nombres email");

    res.json(items);
  } catch (err) {
    console.error("listar mías error:", err);
    res.status(500).json({ mensaje: "Error al listar mis solicitudes" });
  }
};

// ==================== Obtener una =================
exports.obtenerUna = async (req, res) => {
  try {
    const usuario = getUsuario(req);
    const usuarioId = getUsuarioId(usuario);
    if (!usuarioId) return res.status(401).json({ mensaje: "No autenticado" });

    const s = await SolicitudAprobacion.findById(req.params.id)
      .populate("proyectoId", "nombre codigo_proyecto estado rev presupuesto_aprox saldo_abonado")
      .populate("solicitanteId", "usuario_sistema nombres email roles")
      .populate("decididaPorId", "usuario_sistema nombres email");

    if (!s) return res.status(404).json({ mensaje: "No encontrado" });

    if (!esTitular(usuario) && String(s.solicitanteId?._id || s.solicitanteId) !== String(usuarioId)) {
      return res.status(403).json({ mensaje: "No autorizado" });
    }

    res.json(s);
  } catch (err) {
    console.error("obtener solicitud error:", err);
    res.status(500).json({ mensaje: "Error al obtener solicitud" });
  }
};

// ==================== Aprobar =====================
exports.aprobar = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const usuario = getUsuario(req);
    const usuarioId = getUsuarioId(usuario);
    if (!usuarioId) return res.status(401).json({ mensaje: "No autenticado" });
    if (!esTitular(usuario)) return res.status(403).json({ mensaje: "Solo titulares pueden aprobar" });

    let respuestaEnviada = false;

    await session.withTransaction(async () => {
      const s = await SolicitudAprobacion.findById(req.params.id).session(session);
      if (!s) { respuestaEnviada = true; return res.status(404).json({ mensaje: "No encontrado" }); }
      if (s.estado !== "PENDIENTE") { respuestaEnviada = true; return res.status(409).json({ mensaje: "La solicitud ya no está pendiente" }); }

      // Permitir autoaprobación (marcaremos el comentario más abajo)
      const esAuto = String(s.solicitanteId) === String(usuarioId);

      const proyecto = await Proyecto.findById(s.proyectoId).session(session);
      if (!proyecto) { respuestaEnviada = true; return res.status(404).json({ mensaje: "Proyecto no existe" }); }

      let proyectoActualizado = proyecto;

      if (s.tipo === "ABONO") {
        const monto = Number(s?.payload?.abono?.monto || 0);
        if (!Number.isFinite(monto) || monto <= 0) {
          respuestaEnviada = true; return res.status(400).json({ mensaje: "Monto de abono inválido" });
        }

        proyectoActualizado = await Proyecto.findByIdAndUpdate(
          s.proyectoId,
          { $inc: { saldo_abonado: monto } },
          { new: true, runValidators: true, session }
        );

        await Abono.create([{
          proyectoId: s.proyectoId,
          monto,
          metodo: s?.payload?.abono?.metodo || "",
          nota: s?.payload?.abono?.nota || "",
          evidenciaUrl: s?.payload?.abono?.evidenciaUrl || "",
          solicitadoPorId: s.solicitanteId,
          aprobadoPorId: usuarioId,
          solicitadoEn: s.solicitadaEn,
          solicitudId: s._id,
        }], { session });
      }

      if (s.tipo === "CAMBIO_ESTADO") {
        const nuevoEstado = s?.payload?.cambioEstado?.nuevoEstado;
        if (!["Finalizado", "Cancelado"].includes(nuevoEstado)) {
          respuestaEnviada = true; return res.status(400).json({ mensaje: "Estado inválido" });
        }

        proyectoActualizado = await Proyecto.findByIdAndUpdate(
          s.proyectoId,
          { $set: { estado: nuevoEstado } },
          { new: true, runValidators: true, session }
        );
      }

      // ---- marcado de autoaprobación en el comentario ----
      s.estado = "APROBADA";
      s.decididaPorId = usuarioId;
      s.decididaEn = new Date();

      const comentario = (req.body?.comentario || "").trim();
      s.comentarioDecision = esAuto ? `[AUTOAPROBADO] ${comentario}` : comentario;

      s.historial.push({
        accion: "APROBADA",
        por: usuarioId,
        en: new Date(),
        nota: s.comentarioDecision
      });

      // 🔔 Notificar SOLO al solicitante (helper unificado)
      await crearNotificacion({
        id_usuario: String(s.solicitanteId),
        id_proyecto: s.proyectoId,
        tipo: "aprobacion_resuelta",
        titulo: "Solicitud aprobada",
        mensaje: `Tu solicitud ${s.codigo} fue aprobada.`,
      });

      await s.save({ session });

      // Avisar con Socket.IO:
      const io = req.app.get("io");
      io?.emit("proyecto-actualizado", { proyectoId: s.proyectoId });

      respuestaEnviada = true;
      return res.json({ solicitud: s, proyecto: proyectoActualizado });
    });

    if (!respuestaEnviada && !res.headersSent) {
      return res.json({ ok: true });
    }
  } catch (err) {
    console.error("aprobar solicitud error:", err);
    if (!res.headersSent) res.status(500).json({ mensaje: "Error al aprobar solicitud" });
  } finally {
    session.endSession();
  }
};

// ==================== Rechazar ===================
exports.rechazar = async (req, res) => {
  try {
    const usuario = getUsuario(req);
    const usuarioId = getUsuarioId(usuario);
    if (!usuarioId) return res.status(401).json({ mensaje: "No autenticado" });
    if (!esTitular(usuario)) return res.status(403).json({ mensaje: "Solo titulares pueden rechazar" });

    const { comentario } = req.body;

    const s = await SolicitudAprobacion.findById(req.params.id);
    if (!s) return res.status(404).json({ mensaje: "No encontrado" });
    if (s.estado !== "PENDIENTE") return res.status(409).json({ mensaje: "La solicitud ya no está pendiente" });

    s.estado = "RECHAZADA";
    s.decididaPorId = usuarioId;
    s.decididaEn = new Date();
    s.comentarioDecision = (comentario || "").trim();
    s.historial.push({ accion: "RECHAZADA", por: usuarioId, en: new Date(), nota: s.comentarioDecision });
    await s.save();

    // 🔔 Notificar SOLO al solicitante (helper unificado)
    await crearNotificacion({
      id_usuario: String(s.solicitanteId),
      id_proyecto: s.proyectoId,
      tipo: "aprobacion_resuelta",
      titulo: "Solicitud rechazada",
      mensaje: `Tu solicitud ${s.codigo} fue rechazada.`,
    });

    res.json(s);
  } catch (err) {
    console.error("rechazar solicitud error:", err);
    res.status(500).json({ mensaje: "Error al rechazar solicitud" });
  }
};

// ==================== Cancelar ===================
exports.cancelar = async (req, res) => {
  try {
    const usuario = getUsuario(req);
    const usuarioId = getUsuarioId(usuario);
    if (!usuarioId) return res.status(401).json({ mensaje: "No autenticado" });

    const s = await SolicitudAprobacion.findById(req.params.id);
    if (!s) return res.status(404).json({ mensaje: "No encontrado" });
    if (s.estado !== "PENDIENTE") return res.status(409).json({ mensaje: "La solicitud ya no está pendiente" });
    if (String(s.solicitanteId) !== String(usuarioId) && !esTitular(usuario)) {
      return res.status(403).json({ mensaje: "No autorizado para cancelar" });
    }

    s.estado = "CANCELADA";
    s.historial.push({ accion: "CANCELADA", por: usuarioId, en: new Date(), nota: "" });
    await s.save();

    res.json(s);
  } catch (err) {
    console.error("cancelar solicitud error:", err);
    res.status(500).json({ mensaje: "Error al cancelar solicitud" });
  }
};

// GET /api/solicitudes/bloqueo/:proyectoId
exports.bloqueoProyecto = async (req, res) => {
  try {
    const { proyectoId } = req.params;
    const s = await SolicitudAprobacion.findOne({
      proyectoId,
      tipo: "CAMBIO_ESTADO",
      estado: "PENDIENTE",
      "payload.cambioEstado.nuevoEstado": { $in: ["Finalizado", "Cancelado"] },
    }).select("codigo tipo estado payload solicitanteId solicitadaEn");
    if (!s) return res.json({ bloqueado: false });
    return res.json({ bloqueado: true, solicitud: s });
  } catch (err) {
    console.error("bloqueoProyecto error:", err);
    return res.status(500).json({ mensaje: "Error al consultar bloqueo" });
  }
};
