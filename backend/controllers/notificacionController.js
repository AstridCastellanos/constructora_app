// controllers/notificacionController.js
const Notificacion = require("../models/Notificacion");

async function crearNotificacion({ id_usuario, id_proyecto = null, tipo, titulo, mensaje }) {
  return await Notificacion.create({ id_usuario, id_proyecto, tipo, titulo, mensaje });
}

async function listarNotificaciones(req, res) {
  try {
    const userId = req.usuario?._id || req.user?.id || req.user?._id;
    const { tipo, limit = 20 } = req.query;
    const q = { id_usuario: userId };
    if (tipo) q.tipo = tipo;
    const items = await Notificacion.find(q).sort({ fecha_creacion: -1 }).limit(Math.min(+limit || 20, 100));
    res.json(items);
  } catch (e) {
    res.status(500).json({ mensaje: "Error al listar notificaciones" });
  }
}

async function contarNotificaciones(req, res) {
  try {
    const userId = req.usuario?._id || req.user?.id || req.user?._id;
    const [chat, solCreadas, solRes] = await Promise.all([
      Notificacion.countDocuments({ id_usuario: userId, tipo: "chat_mensaje" }),
      Notificacion.countDocuments({ id_usuario: userId, tipo: "aprobacion_solicitada" }),
      Notificacion.countDocuments({ id_usuario: userId, tipo: "aprobacion_resuelta" }),
    ]);
    res.json({ total: chat + solCreadas + solRes, chat, aprobaciones: solCreadas + solRes });
  } catch (e) {
    res.status(500).json({ mensaje: "Error al contar notificaciones" });
  }
}

// leer = borrar (una)
async function marcarLeidaYEliminar(req, res) {
  try {
    const userId = req.usuario?._id || req.user?.id || req.user?._id;
    const { id } = req.params;
    const eliminado = await Notificacion.findOneAndDelete({ _id: id, id_usuario: userId });
    if (!eliminado) return res.status(404).json({ mensaje: "Notificación no encontrada" });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ mensaje: "Error al eliminar notificación" });
  }
}

// leer = borrar (todas o por tipo)
async function marcarTodasLeidasYEliminar(req, res) {
  try {
    const userId = req.usuario?._id || req.user?.id || req.user?._id;
    const { tipo } = req.body || {};
    const filtro = { id_usuario: userId };
    if (tipo) filtro.tipo = tipo;
    const { deletedCount } = await Notificacion.deleteMany(filtro);
    res.json({ ok: true, deletedCount });
  } catch {
    res.status(500).json({ mensaje: "Error al eliminar notificaciones" });
  }
}

module.exports = {
  crearNotificacion,
  listarNotificaciones,
  contarNotificaciones,
  marcarLeidaYEliminar,
  marcarTodasLeidasYEliminar,
};
