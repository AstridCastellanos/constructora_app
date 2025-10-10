const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // Leer el token del encabezado
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ mensaje: "Acceso denegado. Token no proporcionado." });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Guardar datos del usuario en la solicitud
    req.usuario = decoded;

    next(); // continuar hacia el controlador
  } catch (error) {
    res.status(401).json({ mensaje: "Token inválido o expirado." });
  }
};
