const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Límites y filtro de MIME como en middleware/upload.js
const limits = { fileSize: 100 * 1024 * 1024 }; // 100 MB
const MIME_PERMITIDOS = new Set([
  "image/jpeg","image/png","image/gif","image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "video/mp4","video/webm","video/quicktime",
  "text/plain",
]);

function fileFilter(req, file, cb) {
  if (MIME_PERMITIDOS.has(file.mimetype)) return cb(null, true);
  const err = new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Tipo de archivo no permitido");
  return cb(err);
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const mt = file.mimetype || "";

    // Detecta resource_type por mimetype
    let resource_type = "raw";
    if (mt.startsWith("image/")) resource_type = "image";
    else if (mt.startsWith("video/")) resource_type = "video";

    // public_id sin extensión para evitar casos .ext.ext
    const baseName = (file.originalname || "")
      .replace(/\.[^/.]+$/, "") 
      .replace(/\s+/g, "_");

    return {
      folder: "constructora_adjuntos",
      resource_type, 
      public_id: `${Date.now()}-${baseName}`,
    };
  },
});

const upload = multer({ storage, limits, fileFilter });

const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se recibió ningún archivo" });

    // CloudinaryStorage expone path/filename/size/mimetype
    return res.json({
      url: req.file.path,
      public_id: req.file.filename,     
      nombre: req.file.originalname,
      tipo: req.file.mimetype,          
      tamaño: req.file.size,
    });
  } catch (error) {
    return res.status(500).json({ error: "Error al subir archivo" });
  }
};

module.exports = { upload, uploadFile };
