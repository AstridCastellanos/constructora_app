// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // Express normaliza headers a minúsculas en req.headers,
    // pero req.header(...) es case-insensitive. Aun así, soportamos varias fuentes.
    const raw =
      req.header("authorization") ||
      req.header("Authorization") ||
      req.headers["x-access-token"];

    if (!raw) {
      return res.status(401).json({ mensaje: "Acceso denegado. Token no proporcionado." });
    }

    // Soportar "Bearer <token>" o solo "<token>"
    const token = raw.startsWith("Bearer ") ? raw.slice(7).trim() : raw.trim();
    if (!token) {
      return res.status(401).json({ mensaje: "Acceso denegado. Token inválido." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ mensaje: "Token expirado." });
    }
    return res.status(401).json({ mensaje: "Token inválido." });
  }
};
