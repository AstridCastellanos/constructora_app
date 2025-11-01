const cloudinary = require("cloudinary").v2;
const ProyectoDocumento = require("../models/ProyectoDocumento");

// GET /api/proyectos/:id/documentos
async function listByProyecto(req, res) {
  try {
    const { id } = req.params;
    const docs = await ProyectoDocumento.find({ id_proyecto: id }).sort({ creado_en: -1 });

    const docsFirmados = docs.map((d) => {
      const formato = String(d.formato || "").toLowerCase();
      const pid = String(d.public_id || "").toLowerCase();

      const resource_type =
        ["jpg","jpeg","png","gif","webp","svg"].includes(formato) ? "image" :
        ["mp4","mov","webm","avi","mkv"].includes(formato)         ? "video" :
        /\.(jpg|jpeg|png|gif|webp|svg)$/.test(pid)                 ? "image" :
        /\.(mp4|mov|webm|avi|mkv)$/.test(pid)                      ? "video" :
        "raw";

      const url_firmada = cloudinary.url(d.public_id, {
        secure: true,
        resource_type,
        type: "upload",
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });

      const base = typeof d.toObject === "function" ? d.toObject() : d;
      return { ...base, url_firmada, resource_type };
    });

    return res.json(docsFirmados);
  } catch (e) {
    return res.status(500).json({ mensaje: "Error al obtener documentos" });
  }
}

// POST /api/proyectos/:id/documentos  
async function uploadDocumento(req, res) {
  try {
    const file = req.file;
    const { id } = req.params;

    if (!file || !id) {
      return res.status(400).json({ mensaje: "Faltan datos (archivo o id de proyecto)" });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `proyectos/${id}`, resource_type: "auto" },
        (err, r) => (err ? reject(err) : resolve(r))
      );
      stream.end(file.buffer);
    });

    const doc = await ProyectoDocumento.create({
      id_proyecto: id,
      public_id: result.public_id,
      formato: result.format,
      nombre: file.originalname || result.original_filename,
      url: result.secure_url,
      tamaño: result.bytes,
      creado_por: req.usuario?._id,
    });

    return res.status(201).json(doc);
  } catch (e) {
    return res.status(500).json({ mensaje: "Error al subir archivo" });
  }
}

// DELETE /api/proyectos/:id/documentos/:publicId
async function deleteDocumento(req, res) {
  try {
    const { id, publicId } = req.params;

    const doc = await ProyectoDocumento.findOne({ id_proyecto: id, public_id: publicId });
    if (!doc) return res.status(404).json({ mensaje: "Documento no encontrado" });

    await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
    await ProyectoDocumento.deleteOne({ _id: doc._id });

    return res.json({ mensaje: "Documento eliminado" });
  } catch (e) {
    return res.status(500).json({ mensaje: "Error al eliminar documento" });
  }
}

module.exports = {
  listByProyecto,
  uploadDocumento,
  deleteDocumento,
};
