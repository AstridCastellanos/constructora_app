import mongoose from "mongoose";
import validator from "validator";
import xss from "xss";
import Mensaje from "../models/Mensaje.js";
import cloudinary from "../config/cloudinary.js";

/* -------- Helpers de sanitización -------- */

// Remueve claves peligrosas ($, ., __proto__, constructor) para evitar inyección/prototype pollution
function sanitizeKeys(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const clean = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (
      k.startsWith("$") ||
      k.includes(".") ||
      k === "__proto__" ||
      k === "constructor" ||
      k === "prototype"
    ) {
      continue; // descartar la clave peligrosa
    }
    clean[k] = typeof v === "object" ? sanitizeKeys(v) : v;
  }
  return clean;
}

// Limpia texto: recorta, elimina NUL, y aplica XSS filter (para contenido de mensajes)
function sanitizeText(str = "") {
  const trimmed = String(str).replace(/\0/g, "").trim();
  return xss(trimmed, {
    whiteList: {}, // sin HTML permitido; si deseas permitir <b>, <i>, etc., configúralo aquí
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style", "iframe"],
  });
}

// Deducción simple de resource_type para entrega en Cloudinary
function guessResourceType({ formato, mimetype }) {
  const f = (formato || "").toLowerCase();
  const mt = (mimetype || "").toLowerCase();

  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].some((ext) => f.endsWith(ext)) ||
                  mt.startsWith("image/");
  const isVideo = ["mp4", "mov", "webm", "avi", "mkv"].some((ext) => f.endsWith(ext)) ||
                  mt.startsWith("video/");

  if (isImage) return "image";
  if (isVideo) return "video";
  return "raw"; // pdf, docx, zip, etc.
}

// Normaliza/sanitiza un objeto "archivo" que viene del frontend (ya subido a Cloudinary)
function sanitizeArchivo(inArchivo) {
  const a = sanitizeKeys(inArchivo || {});
  const archivo = {
    public_id: typeof a.public_id === "string" ? a.public_id.trim() : "",
    nombre: typeof a.nombre === "string" ? a.nombre.trim() : "",
    formato: typeof a.formato === "string" ? a.formato.trim().toLowerCase() : "",
    url: typeof a.url === "string" ? a.url.trim() : "",
    tamaño: Number.isFinite(Number(a.tamaño)) ? Number(a.tamaño) : undefined,
    mimetype: typeof a.mimetype === "string" ? a.mimetype.trim() : undefined,
    resource_type: typeof a.resource_type === "string" ? a.resource_type.trim() : undefined,
  };

  // Validaciones mínimas
  if (!archivo.public_id) {
    throw new Error("Archivo sin public_id");
  }
  // Nombre seguro (evita path traversal visual; no afecta Cloudinary)
  archivo.nombre = archivo.nombre.replace(/[\\\/:*?"<>|]+/g, " ").slice(0, 255);

  return archivo;
}

/* --------------- Controllers --------------- */

// Crear mensaje
export const crearMensaje = async (req, res) => {
  try {
    // Tomar autor del JWT, no del body
    const autor_id = req.usuario?.id || req.usuario?._id;
    if (!autor_id) {
      return res.status(401).json({ mensaje: "No autenticado" });
    }

    // Sanitizar y validar id_proyecto
    const raw = sanitizeKeys(req.body || {});
    const id_proyecto = raw.id_proyecto;
    if (!mongoose.Types.ObjectId.isValid(id_proyecto)) {
      return res.status(400).json({ mensaje: "id_proyecto inválido" });
    }

    // Sanitizar contenido
    const contenido = sanitizeText(raw.contenido || "");

    // Sanitizar archivos (metadatos de Cloudinary)
    const archivosInput = Array.isArray(raw.archivos) ? raw.archivos : [];
    const archivos = archivosInput.map(sanitizeArchivo);

    const nuevoMensaje = new Mensaje({
      id_proyecto,
      autor_id,
      contenido,
      archivos,
    });

    const mensajeGuardado = await nuevoMensaje.save();

    const mensajeConDatos = await Mensaje.findById(mensajeGuardado._id)
      .populate("autor_id", "nombres email") // limita campos si quieres
      .populate("id_proyecto");

    // Emitir por Socket.IO (si aplica)
    const io = req.app.get("io");
    if (io) io.emit("mensaje-actualizado", mensajeConDatos);

    return res.json(mensajeConDatos);
  } catch (error) {
    console.error("Error al crear mensaje:", error);
    return res
      .status(500)
      .json({ mensaje: "Error al crear mensaje", detalle: error.message });
  }
};

// Obtener mensajes por proyecto (URLs firmadas, detectando resource_type)
export const obtenerMensajesPorProyecto = async (req, res) => {
  try {
    const proyectoId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(proyectoId)) {
      return res.status(400).json({ mensaje: "id de proyecto inválido" });
    }

    const mensajes = await Mensaje.find({ id_proyecto: proyectoId })
      .populate("autor_id", "nombres email")
      .sort({ fecha_envio: 1 });

    const ahora = Math.floor(Date.now() / 1000);
    const expiraEn = ahora + 3600; // 1 hora

    const mensajesFirmados = mensajes.map((m) => {
      const archivosFirmados = m.archivos.map((a) => {
        if (!a.public_id) return a;

        // 1) Mapear por 'tipo' que tú guardas en Mongo
        let resource_type;
        switch (a.tipo) {
          case "imagen": resource_type = "image"; break;
          case "video":  resource_type = "video"; break;
          default:       resource_type = "raw";   break; // pdf/docx/otros
        }

        // 2) Fallback heurístico si por alguna razón 'tipo' viniera vacío
        if (!resource_type) {
          const pid = String(a.public_id).toLowerCase();
          resource_type =
            /\.(jpg|jpeg|png|gif|webp|svg)$/.test(pid) ? "image" :
            /\.(mp4|mov|webm|avi|mkv)$/.test(pid)      ? "video" :
            "raw";
        }

        const signedUrl = cloudinary.url(a.public_id, {
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
    console.error("Error al obtener mensajes:", error);
    return res.status(500).json({ mensaje: "Error al obtener mensajes" });
  }
};
