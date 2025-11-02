const axios = require("axios");
const Mensaje = require("../models/Mensaje");
const ProyectoDocumento = require("../models/ProyectoDocumento");
const cloudinary = require("../config/cloudinary.js");

function tipoToResourceType(tipo) {
  if (tipo === "imagen") return "image";
  if (tipo === "video") return "video";
  return "raw";
}
function guessTipoFromFormato(formato) {
  if (!formato) return "otros";
  const f = String(formato).toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg"].includes(f)) return "imagen";
  if (["mp4","mov","webm","avi","mkv"].includes(f)) return "video";
  if (f === "pdf") return "pdf";
  if (f === "docx") return "docx";
  return "otros";
}


async function descargarOAbrirArchivo(req, res) {
  try {
    const public_id = decodeURIComponent(req.params[0] || "");
    if (!public_id) return res.status(400).json({ error: "Falta el public_id" });

    const download = String(req.query.download) === "true";

    let resource_type = req.query.rt;
    if (!["image", "video", "raw"].includes(resource_type)) resource_type = undefined;

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
        if (!nombre) nombre = doc.nombre;
        if (!formato) formato = doc.formato;
        if (!tipo) tipo = guessTipoFromFormato(doc.formato);
      }
    }

    if (!resource_type) {
      resource_type = tipoToResourceType(tipo);
    }

    const defaultBase = public_id.split("/").pop() || "archivo";
    const filename = nombre || (formato ? `${defaultBase}.${formato}` : defaultBase);

    const signedUrl = cloudinary.url(public_id, {
      secure: true,
      resource_type,
      type: "upload",
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      flags: download ? "attachment" : undefined,
      attachment: download ? filename : undefined,
    });

    if (resource_type !== "raw") {
      return res.redirect(signedUrl);
    }

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
    return res.status(500).json({ error: "Error al procesar archivo" });
  }
}

module.exports = { descargarOAbrirArchivo };
