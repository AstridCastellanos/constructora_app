const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const extension = file.mimetype.split("/")[1];
    const esArchivo = [
      "pdf",
      "msword",
      "vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(extension);

    return {
      folder: "constructora_adjuntos",
      resource_type: esArchivo ? "raw" : "image",
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
    };
  },
});

const upload = multer({ storage });

const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se recibió ningún archivo" });

    // ✅ Cloudinary siempre devuelve "filename" y "path"
    res.json({
      url: req.file.path,
      public_id: req.file.filename, // ⚡️ AQUÍ viene el ID real que debes guardar
      nombre: req.file.originalname,
      tipo: req.file.mimetype,
      tamaño: req.file.size,
    });
  } catch (error) {
    console.error("Error al subir archivo:", error);
    res.status(500).json({ error: "Error al subir archivo" });
  }
};

module.exports = { upload, uploadFile };
