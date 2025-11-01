const mongoose = require("mongoose");
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
    
    const mensajeConAutor = await guardado.populate("autor_id", "nombres usuario_sistema");

    const participantes = await participantesProyecto(guardado.id_proyecto);

    // Normaliza el id del autor a string
    const autorIdStr = String(
      guardado?.autor_id?._id ??
      guardado?.autor_id ??
      ""
    );

    // helper local para normalizar ids (doc, ObjectId o string)
    const normId = (v) => {
      try {
        if (!v) return "";
        if (typeof v === "string") return v;
        if (v instanceof mongoose.Types.ObjectId) return v.toString();
        if (v._id) return String(v._id); 
        return String(v);                
      } catch {
        return "";
      }
    };

    // Obtener nombre del proyecto para el título
    const Proyecto = require("../models/Proyecto");
    const proyecto = await Proyecto.findById(guardado.id_proyecto).select("nombre");
    const titulo = proyecto?.nombre
      ? `Nuevo mensaje en ${proyecto.nombre}`
      : "Nuevo mensaje en el proyecto";

    // Cuerpo: "usuario_sistema: contenido"
    const autorUser = mensajeConAutor?.autor_id?.usuario_sistema || "usuario";
    const contenidoBase =
      (guardado.contenido && guardado.contenido.trim())
        ? guardado.contenido.trim().slice(0, 120)
        : "Mensaje con adjuntos";
    const preview = `${autorUser}: ${contenidoBase}`;

    // Exclusión del autor y solo ids normalizados
    const vistos = new Set();
    const destinatarios = [];

    for (const uid of participantes || []) {
      const uidStr = normId(uid);
      const esAutor = uidStr && autorIdStr && uidStr === autorIdStr;

      if (!uidStr) continue;
      if (esAutor) continue;            
      if (vistos.has(uidStr)) continue; 
      vistos.add(uidStr);
      destinatarios.push(uidStr);
    }


    // NOTIFICAR (una sola vez)
    if (destinatarios.length) {
      await Promise.all(
        destinatarios.map((uidStr) => {
          if (uidStr === autorIdStr) {
            return null;
          }
          return crearNotificacion({
            id_usuario: uidStr,
            id_proyecto: guardado.id_proyecto,
            tipo: "chat_mensaje",
            titulo,
            mensaje: preview,
          });
        })
      );
    }

    return res.status(201).json(mensajeConAutor);
  } catch (error) {
    return res
      .status(400)
      .json({ mensaje: "Error al crear mensaje", error: error.message || error });
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
