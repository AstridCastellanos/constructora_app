import { useContext, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { usuario, rol, token } = useContext(AuthContext);

  // Si no hay datos cargados aún, verifica el localStorage
  const tokenGuardado = token || localStorage.getItem("token");
  const usuarioGuardado =
    usuario || JSON.parse(localStorage.getItem("usuario") || "null");
  const rolGuardado = rol || localStorage.getItem("rol");

  if (!usuarioGuardado && !tokenGuardado) {
    return <Navigate to="/login" replace />;
    console.log("ProtectedRoute:", { usuarioGuardado, tokenGuardado });

  }

  // 🔹 Validar roles si se requiere
  if (allowedRoles && !allowedRoles.includes(rolGuardado)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ✅ Autenticado y con permisos
  return children;
}
