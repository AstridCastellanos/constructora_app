// controllers/mensajeController.js
const Mensaje = require("../models/Mensaje");
const cloudinary = require("../config/cloudinary.js").default;

// Helpers de notificaciones
const { crearNotificacion } = require("./notificacionController");
const { participantesProyecto } = require("./_notif.helpers");

// Deducción de resource_type
function deduceResourceType(publicId) {
  const pid = String(publicId).toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(pid)) return "image";
  if (/\.(mp4|mov|webm|avi|mkv)$/.test(pid)) return "video";
  return "raw";
}
function mapTipoToResourceType(tipo, publicId) {
  if (tipo === "imagen") return "image";
  if (tipo === "video") return "video";
  if (tipo) return "raw";
  return deduceResourceType(publicId);
}

// POST /api/mensajes
async function crearMensaje(req, res) {
  try {
    const nuevoMensaje = new Mensaje(req.body);
    const guardado = await nuevoMensaje.save();

    // importante: devolver el mensaje con datos de autor como antes
    const mensajeConAutor = await guardado.populate("autor_id", "nombres usuario_sistema");

    // === Notificaciones: a todos los participantes excepto el autor (incluye clientes) ===
    const participantes = await participantesProyecto(guardado.id_proyecto);
    const autorId = String(guardado.autor_id);
    const destinatarios = participantes.filter((uid) => String(uid) !== autorId);

    const titulo = "Nuevo mensaje de chat";
    const preview =
      guardado.contenido && guardado.contenido.trim()
        ? guardado.contenido.slice(0, 120)
        : "Mensaje con adjuntos";

    await Promise.all(
      destinatarios.map((uid) =>
        crearNotificacion({
          id_usuario: uid,
          id_proyecto: guardado.id_proyecto,
          tipo: "chat_mensaje",
          titulo,
          mensaje: preview,
        })
      )
    );

    // (Opcional: si usas sockets para el badge en tiempo real)
    // destinatarios.forEach(uid => req.io?.to(`notifications:${uid}`).emit('notifications:new'));

    return res.status(201).json(mensajeConAutor);
  } catch (error) {
    console.error("Error al crear mensaje:", error);
    return res.status(400).json({ mensaje: "Error al crear mensaje", error: error.message || error });
  }
}

// GET /api/mensajes
async function listarMensajes(req, res) {
  try {
    const mensajes = await Mensaje.find()
      .populate("autor_id", "nombres usuario_sistema")
      .populate("id_proyecto", "nombre codigo_proyecto");

    const mensajesFirmados = mensajes.map((m) => {
      const archivosFirmados = (m.archivos || []).map((a) => {
        if (!a.public_id) return a;
        const resource_type = mapTipoToResourceType(a.tipo, a.public_id);

        const signedUrl = cloudinary.url(a.public_id, {
          secure: true,
          resource_type,
          type: "upload",
          sign_url: true,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        });

        return { ...a.toObject(), url_firmada: signedUrl, resource_type };
      });

      return { ...m.toObject(), archivos: archivosFirmados };
    });

    return res.json(mensajesFirmados);
  } catch (error) {
    console.error("Error al obtener mensajes:", error.message);
    return res.status(500).json({ mensaje: "Error al obtener mensajes", detalle: error.message });
  }
}

// GET /api/mensajes/proyecto/:id_proyecto
async function listarMensajesPorProyecto(req, res) {
  try {
    const { id_proyecto } = req.params;

    const mensajes = await Mensaje.find({ id_proyecto })
      .populate("autor_id", "nombres usuario_sistema")
      .sort({ fecha_envio: 1 });

    const mensajesFirmados = mensajes.map((m) => {
      const archivosFirmados = (m.archivos || []).map((a) => {
        if (!a.public_id) return a;
        const resource_type = mapTipoToResourceType(a.tipo, a.public_id);

        const signedUrl = cloudinary.url(a.public_id, {
          secure: true,
          resource_type,
          type: "upload",
          sign_url: true,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        });

        return { ...a.toObject(), url_firmada: signedUrl, resource_type };
      });

      return { ...m.toObject(), archivos: archivosFirmados };
    });

    return res.json(mensajesFirmados);
  } catch (error) {
    console.error("Error al obtener mensajes por proyecto:", error.message);
    return res.status(500).json({
      mensaje: "Error al obtener mensajes por proyecto",
      detalle: error.message,
    });
  }
}

module.exports = {
  crearMensaje,
  listarMensajes,
  listarMensajesPorProyecto,
};
