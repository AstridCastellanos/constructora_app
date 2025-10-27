// controllers/notificacionController.js
const mongoose = require("mongoose");
const Notificacion = require("../models/Notificacion");
const { getIO } = require("../utils/io");

/**
 * Crea una notificación en BD y emite tiempo real al room del usuario.
 * @param {Object} params
 * @param {String|mongoose.Types.ObjectId} params.id_usuario
 * @param {String|mongoose.Types.ObjectId} [params.id_proyecto]
 * @param {String} params.tipo - 'chat_mensaje' | 'aprobacion_solicitada' | 'aprobacion_resuelta' | ...
 * @param {String} params.titulo
 * @param {String} params.mensaje
 */
async function crearNotificacion({ id_usuario, id_proyecto, tipo, titulo, mensaje }) {
  const notif = new Notificacion({
    id_usuario,
    id_proyecto: id_proyecto || null,
    tipo,
    titulo,
    mensaje,
    fecha_creacion: new Date(),
  });

  const doc = await notif.save();

  // Emitir en tiempo real (no romper si falla)
  try {
    const io = getIO();
    if (io) {
      const userRoom = `user:${doc.id_usuario.toString()}`;
      io.to(userRoom).emit("notificaciones:nueva", {
        ping: true,
        tipo: doc.tipo,
      });
      // console.log(`[notifs] emit => ${userRoom} tipo=${doc.tipo}`);
    }
  } catch (e) {
    console.warn("No se pudo emitir notificación en tiempo real:", e?.message || e);
  }

  return doc;
}

/**
 * GET /api/notificaciones
 * Lista notificaciones del usuario autenticado (ordenadas desc por fecha).
 * Query: ?tipo=...&limit=20
 */
async function listarNotificaciones(req, res) {
  try {
    const userId = req.usuario?._id || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ mensaje: "No autenticado" });

    const { tipo, limit = 20 } = req.query;
    const lim = Math.min(Number(limit) || 20, 100);

    const filtro = { id_usuario: userId };
    if (tipo) filtro.tipo = tipo;

    // console.log("[notifs] listar -> user:", String(userId), "filtro:", filtro, "limit:", lim);

    const items = await Notificacion.find(filtro)
      .sort({ fecha_creacion: -1 })
      .limit(lim);

    return res.json(items);
  } catch (e) {
    console.error("Error al listar notificaciones:", e);
    return res.status(500).json({ mensaje: "Error al listar notificaciones" });
  }
}

/**
 * GET /api/notificaciones/counts
 * Devuelve contadores para badge { total, chat, aprobaciones }
 */
async function contarNotificaciones(req, res) {
  try {
    const userId = req.usuario?._id || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ mensaje: "No autenticado" });

    const [chat, solCreadas, solRes] = await Promise.all([
      Notificacion.countDocuments({ id_usuario: userId, tipo: "chat_mensaje" }),
      Notificacion.countDocuments({ id_usuario: userId, tipo: "aprobacion_solicitada" }),
      Notificacion.countDocuments({ id_usuario: userId, tipo: "aprobacion_resuelta" }),
    ]);

    const total = chat + solCreadas + solRes;
    // console.log("[notifs] counts ->", { total, chat, aprobaciones: solCreadas + solRes });

    return res.json({ total, chat, aprobaciones: solCreadas + solRes });
  } catch (e) {
    console.error("Error al contar notificaciones:", e);
    return res.status(500).json({ mensaje: "Error al contar notificaciones" });
  }
}

/**
 * PATCH /api/notificaciones/:id/read
 * "Leer" = eliminar una notificación del usuario
 */
async function marcarLeidaYEliminar(req, res) {
  try {
    const userId = req.usuario?._id || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ mensaje: "No autenticado" });

    const { id } = req.params;
    const eliminado = await Notificacion.findOneAndDelete({ _id: id, id_usuario: userId });

    if (!eliminado) return res.status(404).json({ mensaje: "Notificación no encontrada" });
    return res.json({ ok: true });
  } catch (e) {
    console.error("Error al eliminar notificación:", e);
    return res.status(500).json({ mensaje: "Error al eliminar notificación" });
  }
}

/**
 * PATCH /api/notificaciones/read-all
 * "Leer" = eliminar todas (o por tipo) del usuario
 * Body opcional: { tipo: "chat_mensaje" | "aprobacion_solicitada" | ... }
 */
async function marcarTodasLeidasYEliminar(req, res) {
  try {
    const userId = req.usuario?._id || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ mensaje: "No autenticado" });

    const { tipo, id_proyecto } = req.body || {};
    const filtro = { id_usuario: userId };
    if (tipo) filtro.tipo = tipo;
    if (id_proyecto) filtro.id_proyecto = id_proyecto;

    const r = await Notificacion.deleteMany(filtro);
    return res.json({ ok: true, deletedCount: r?.deletedCount || 0 });
  } catch (e) {
    console.error("Error al eliminar notificaciones:", e);
    return res.status(500).json({ mensaje: "Error al eliminar notificaciones" });
  }
}

module.exports = {
  crearNotificacion,
  listarNotificaciones,
  contarNotificaciones,
  marcarLeidaYEliminar,
  marcarTodasLeidasYEliminar,
};
