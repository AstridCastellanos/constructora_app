const express = require("express");
const router = express.Router();
const Mensaje = require("../models/Mensaje");
const cloudinary = require("../config/cloudinary.js").default;
const axios = require("axios");
const ProyectoDocumento = require("../models/ProyectoDocumento");

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

        const pid = String(a.public_id).toLowerCase();
        const resource_type =
          /\.(jpg|jpeg|png|gif|webp|svg)$/.test(pid) ? "image" :
          /\.(mp4|mov|webm|avi|mkv)$/.test(pid)      ? "video" :
          "raw";

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

        const pid = String(a.public_id).toLowerCase();
        const resource_type =
          /\.(jpg|jpeg|png|gif|webp|svg)$/.test(pid) ? "image" :
          /\.(mp4|mov|webm|avi|mkv)$/.test(pid)      ? "video" :
          "raw";

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

    res.json(mensajesFirmados);
  } catch (error) {
    console.error("Error al obtener mensajes por proyecto:", error.message);
    res.status(500).json({
      mensaje: "Error al obtener mensajes por proyecto",
      detalle: error.message,
    });
  }
});

// Descargar/abrir archivo (imágenes y videos redirigen, RAW se proxyea con headers)
router.get(/^\/archivo\/(.+)$/, async (req, res) => {
  try {
    const public_id = decodeURIComponent(req.params[0] || "");
    if (!public_id) return res.status(400).json({ error: "Falta el public_id" });

    const download = String(req.query.download) === "true";

    // Determinar resource_type con prioridad al query ?rt=
    let resource_type = req.query.rt;
    if (!["image", "video", "raw"].includes(resource_type)) resource_type = undefined;

    // Si no viene, deducir por lo que hay en Mongo
    let tipo, nombre, formato, mimetype;

    const msg = await Mensaje.findOne(
      { "archivos.public_id": public_id },
      { "archivos.$": 1 }
    ).lean();

    if (msg?.archivos?.[0]) {
      const a = msg.archivos[0];
      tipo = a.tipo;
      nombre = a.nombre;
      formato = a.formato;
      mimetype = a.mimetype;
    }

    if (!tipo || !resource_type) {
      const doc = await ProyectoDocumento.findOne(
        { public_id },
        { nombre: 1, formato: 1 }
      ).lean();
      if (doc) {
        nombre = nombre || doc.nombre;
        formato = formato || doc.formato;
        if (!tipo && formato) {
          const f = String(formato).toLowerCase();
          if (["jpg","jpeg","png","gif","webp","svg"].includes(f)) tipo = "imagen";
          else if (["mp4","mov","webm","avi","mkv"].includes(f))   tipo = "video";
          else tipo = "otros";
        }
      }
    }

    if (!resource_type) {
      switch (tipo) {
        case "imagen": resource_type = "image"; break;
        case "video":  resource_type = "video"; break;
        default:       resource_type = "raw";   break;
      }
    }

    // URL firmada (https) con opción de descarga para image/video
    const defaultBase = public_id.split("/").pop() || "archivo";
    const filename =
      nombre || (formato ? `${defaultBase}.${formato}` : defaultBase);

    const signedUrl = cloudinary.url(public_id, {
      secure: true,
      resource_type,
      type: "upload",
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      flags: download ? "attachment" : undefined,
      attachment: download ? filename : undefined,
    });

    // Imágenes y videos: redirige
    if (resource_type !== "raw") {
      return res.redirect(signedUrl);
    }

    // RAW (PDF/DOCX): proxy con headers correctos
    const ct =
      mimetype ||
      (tipo === "pdf"
        ? "application/pdf"
        : tipo === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : formato === "pdf"
        ? "application/pdf"
        : formato === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/octet-stream");

    const disp = download ? "attachment" : "inline";

    const fileRes = await axios.get(signedUrl, { responseType: "arraybuffer" });

    res.set({
      "Content-Type": ct,
      "Content-Disposition": `${disp}; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-cache",
      "X-Content-Type-Options": "nosniff",
    });

    return res.send(fileRes.data);
  } catch (error) {
    console.error("Error al procesar archivo:", error.message);
    return res.status(500).json({ error: "Error al procesar archivo" });
  }
});

module.exports = router;
