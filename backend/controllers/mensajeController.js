import Mensaje from "../models/Mensaje.js";
import cloudinary from "../config/cloudinary.js";

// Crear mensaje
export const crearMensaje = async (req, res) => {
  try {
    const { id_proyecto, autor_id, contenido, archivos = [] } = req.body;

    const nuevoMensaje = new Mensaje({
      id_proyecto,
      autor_id,
      contenido,
      archivos,
    });

    // Guardar mensaje
    const mensajeGuardado = await nuevoMensaje.save();

    // Volver a cargarlo con populate (para que tenga autor y proyecto completos)
    const mensajeConDatos = await Mensaje.findById(mensajeGuardado._id)
      .populate("autor_id")
      .populate("id_proyecto");

    // Emitir mensaje en tiempo real con Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.emit("mensaje-actualizado", mensajeConDatos);
    } else {
      console.warn("⚠️ No se encontró instancia de Socket.IO");
    }

    res.json(mensajeConDatos);
  } catch (error) {
    console.error("Error al crear mensaje:", error);
    res
      .status(500)
      .json({ mensaje: "Error al crear mensaje", detalle: error.message });
  }
};


// Obtener mensajes por proyecto (con URLs firmadas)
export const obtenerMensajesPorProyecto = async (req, res) => {
  try {
    const mensajes = await Mensaje.find({ id_proyecto: req.params.id })
      .populate("autor_id")
      .sort({ fecha_envio: 1 });

    // Generar URLs firmadas para cada archivo
    const mensajesFirmados = mensajes.map((m) => {
      const archivosFirmados = m.archivos.map((a) => {
        const signedUrl = cloudinary.url(a.public_id, {
          resource_type: "raw",
          type: "upload",
          sign_url: true,
          expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hora
        });

        return {
          ...a.toObject(),
          url_firmada: signedUrl,
        };
      });

      return {
        ...m.toObject(),
        archivos: archivosFirmados,
      };
    });

    res.json(mensajesFirmados);
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    res.status(500).json({ mensaje: "Error al obtener mensajes" });
  }
};
