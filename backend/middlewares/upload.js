const multer = require("multer");

const storage = multer.memoryStorage();
const limits = { fileSize: 20 * 1024 * 1024 }; // 20 MB

const MIME_PERMITIDOS = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

function fileFilter(req, file, cb) {
  if (MIME_PERMITIDOS.has(file.mimetype)) return cb(null, true);
  const err = new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Tipo de archivo no permitido");
  return cb(err);
}

const upload = multer({ storage, limits, fileFilter });

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const mensaje =
      err.code === "LIMIT_FILE_SIZE"
        ? "El archivo excede el tamaño máximo permitido."
        : err.code === "LIMIT_UNEXPECTED_FILE"
        ? "Tipo de archivo no permitido."
        : "Error al procesar el archivo.";
    return res.status(400).json({ mensaje, detalle: err.code });
  }
  return next(err);
}

module.exports = { upload, handleMulterError };
