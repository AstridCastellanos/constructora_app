import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { usuario, roles, token } = useContext(AuthContext);

  const tokenGuardado = token || localStorage.getItem("token");

  let rolesGuardados = roles || [];

  if (rolesGuardados.length === 0) {
    try {
      const parsed = JSON.parse(localStorage.getItem("rol") || "[]");
      rolesGuardados = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      rolesGuardados = [];
    }
  }

  if (!usuario && !tokenGuardado) {
    return <Navigate to="/login" replace />;
  }

  // Validar roles
  if (allowedRoles && !allowedRoles.some(r => rolesGuardados.includes(r))) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Bloquear clientes desde PC
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  if (rolesGuardados.includes("cliente") && !isMobile) {
    return <Navigate to="/login" replace />;
  }

  // Autenticado y autorizado
  return children;
}
