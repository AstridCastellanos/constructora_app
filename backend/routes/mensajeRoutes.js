const express = require("express");
const router = express.Router();
const Mensaje = require("../models/Mensaje");
const cloudinary = require("../config/cloudinary.js").default;
const axios = require("axios");

// Crear un nuevo mensaje
router.post("/", async (req, res) => {
  try {
    const nuevoMensaje = new Mensaje(req.body);
    const guardado = await nuevoMensaje.save();

    // Poblar el autor para devolverlo completo
    const mensajeConAutor = await guardado.populate("autor_id", "nombres usuario_sistema");

    res.status(201).json(mensajeConAutor);
  } catch (error) {
    console.error("Error al crear mensaje:", error);
    res.status(400).json({ mensaje: "Error al crear mensaje", error });
  }
});

// Obtener todos los mensajes
router.get("/", async (req, res) => {
  try {
    const mensajes = await Mensaje.find()
      .populate("autor_id", "nombres usuario_sistema")
      .populate("id_proyecto", "nombre codigo_proyecto");

    const mensajesFirmados = mensajes.map((m) => {
      const archivosFirmados = m.archivos.map((a) => {
        if (!a.public_id) return a;

        const signedUrl = cloudinary.url(a.public_id, {
          resource_type: "raw",
          type: "upload",
          sign_url: true,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        });

        return { ...a.toObject(), url_firmada: signedUrl };
      });

      return { ...m.toObject(), archivos: archivosFirmados };
    });

    res.json(mensajesFirmados);
  } catch (error) {
    console.error("Error al obtener mensajes:", error.message);
    res.status(500).json({ mensaje: "Error al obtener mensajes", detalle: error.message });
  }
});

// Obtener mensajes de un proyecto específico
router.get("/proyecto/:id_proyecto", async (req, res) => {
  try {
    const { id_proyecto } = req.params;

    const mensajes = await Mensaje.find({ id_proyecto })
      .populate("autor_id", "nombres usuario_sistema")
      .sort({ fecha_envio: 1 });

    const mensajesFirmados = mensajes.map((m) => {
      const archivosFirmados = m.archivos.map((a) => {
        if (!a.public_id) return a;

        const signedUrl = cloudinary.url(a.public_id, {
          resource_type: "raw",
          type: "upload",
          sign_url: true,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        });

        return { ...a.toObject(), url_firmada: signedUrl };
      });

      return { ...m.toObject(), archivos: archivosFirmados };
    });

    res.json(mensajesFirmados);
  } catch (error) {
    console.error("Error al obtener mensajes por proyecto:", error.message);
    res.status(500).json({
      mensaje: "Error al obtener mensajes por proyecto",
      detalle: error.message,
    });
  }
});

// Descargar archivo (compatible con imágenes, PDF, DOCX, etc.)
router.get(/^\/archivo\/(.+)$/, async (req, res) => {
  try {
    const public_id = req.params[0];
    const { download } = req.query; // ?download=true

    if (!public_id) return res.status(400).json({ error: "Falta el public_id" });

    // Detectar tipo MIME
    let contentType = "application/octet-stream";
    let resourceType = "raw";

    if (public_id.match(/\.pdf$/i)) {
      contentType = "application/pdf";
      resourceType = "raw";
    } else if (public_id.match(/\.docx$/i)) {
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      resourceType = "raw";
    } else if (public_id.match(/\.(jpg|jpeg|png)$/i)) {
      contentType = "image/jpeg";
      resourceType = "image";
    }

    const fileUrl = cloudinary.url(public_id, {
      resource_type: resourceType,
      type: "upload",
      sign_url: false, 
    });

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const nombreArchivo = public_id.split("/").pop();

    res.set({
      "Content-Type": contentType,
      "Content-Disposition":
        download === "true"
          ? `attachment; filename="${nombreArchivo}"`
          : `inline; filename="${nombreArchivo}"`,
    });

    res.send(response.data);
  } catch (error) {
    console.error("❌ Error al procesar archivo:", error.message);
    res.status(500).json({ error: "Error al procesar archivo" });
  }
});


module.exports = router;
