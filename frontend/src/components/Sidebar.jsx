import React, { useState, useContext } from "react";
import {
  Folder,
  MessageSquare,
  CheckSquare,
  Settings,
  LogOut,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Toast from "./Toast";
import "../styles/Sidebar.css";
import { AuthContext } from "../context/AuthContext";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, usuario } = useContext(AuthContext); // debe tener usuario.roles

  const [toast, setToast] = useState(null);

  const handleLogout = () => {
    logout();
    setToast({ msg: "Sesión cerrada correctamente", type: "success" });

    setTimeout(() => {
      setToast(null);
      navigate("/login", { replace: true });
    }, 2500);
  };

  // ===============================
  // Control de visibilidad por rol
  // ===============================
  const roles = usuario?.roles || [];

  const puedeVer = (vista) => {
    if (roles.includes("titular")) return true;
    if (vista === "proyectos" && roles.includes("colaborador")) return true;
    if (vista === "chat" && (roles.includes("colaborador") || roles.includes("cliente"))) return true;
    if (vista === "ajustes" && roles.includes("administrador")) return true;
    if (vista === "solicitudes" && (roles.includes("titular") || roles.includes("colaborador"))) return true;
    return false;
  };

  return (
    <aside className="sb">
      <div className="sb-avatar">PS</div>

      <nav className="sb-nav">
        {puedeVer("proyectos") && (
          <button
            className={`sb-btn ${location.pathname === "/proyectos" ? "sb-active" : ""}`}
            title="Proyectos"
            onClick={() => navigate("/proyectos")}
          >
            <Folder />
          </button>
        )}

        {puedeVer("chat") && (
          <button
            className={`sb-btn ${location.pathname === "/chat" ? "sb-active" : ""}`}
            title="Chat"
            onClick={() => navigate("/chat")}
          >
            <MessageSquare />
          </button>
        )}

        {puedeVer("solicitudes") && (
          <button
            className={`sb-btn ${location.pathname === "/solicitudes" ? "sb-active" : ""}`}
            title="Solicitudes"
            onClick={() => navigate("/solicitudes")}
          >
            <CheckSquare />
          </button>
        )}

        {puedeVer("ajustes") && (
          <button
            className={`sb-btn ${location.pathname === "/usuarios" ? "sb-active" : ""}`}
            title="Configuración"
            onClick={() => navigate("/usuarios")}
          >
            <Settings />
          </button>
        )}
      </nav>

      <div className="sb-bottom">
        <button className="sb-btn" title="Salir" onClick={handleLogout}>
          <LogOut />
        </button>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </aside>
  );
}
