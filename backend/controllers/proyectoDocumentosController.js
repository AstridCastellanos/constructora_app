const cloudinary = require('cloudinary').v2;
const ProyectoDocumento = require('../models/ProyectoDocumento');

// GET /api/proyectos/:id/documentos
exports.listByProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    const docs = await ProyectoDocumento
      .find({ id_proyecto: id })
      .sort({ creado_en: -1 });
    return res.json(docs);
  } catch (e) {
    console.error('Error listando documentos:', e);
    return res.status(500).json({ mensaje: 'Error al obtener documentos' });
  }
};

// POST /api/archivos/upload  (FormData: archivo, id_proyecto)
exports.uploadDocumento = async (req, res) => {
  try {
    const file = req.file;
    const { id } = req.params; // <-- id del proyecto viene en la URL

    if (!file || !id) {
      return res.status(400).json({ mensaje: "Faltan datos (archivo o id de proyecto)" });
    }

    // Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `proyectos/${id}`, resource_type: "auto" },
        (err, r) => (err ? reject(err) : resolve(r))
      );
      stream.end(file.buffer);
    });

    // Guardar en Mongo
    const doc = await ProyectoDocumento.create({
      id_proyecto: id,
      public_id: result.public_id,
      formato: result.format,
      nombre: file.originalname || result.original_filename,
      url: result.secure_url,
      tamaño: result.bytes,
      creado_por: req.usuario?._id
    });

    return res.status(201).json(doc);
  } catch (e) {
    console.error("Error al subir documento:", e);
    return res.status(500).json({ mensaje: "Error al subir archivo" });
  }
};


// (Opcional) DELETE /api/proyectos/:id/documentos/:publicId
exports.deleteDocumento = async (req, res) => {
  try {
    const { id, publicId } = req.params;

    const doc = await ProyectoDocumento.findOne({ id_proyecto: id, public_id: publicId });
    if (!doc) return res.status(404).json({ mensaje: 'Documento no encontrado' });

    // borrar en Cloudinary
    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });

    await ProyectoDocumento.deleteOne({ _id: doc._id });

    return res.json({ mensaje: 'Documento eliminado' });
  } catch (e) {
    console.error('Error al eliminar documento:', e);
    return res.status(500).json({ mensaje: 'Error al eliminar documento' });
  }
};
