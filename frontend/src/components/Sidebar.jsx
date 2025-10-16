import React, { useState, useContext } from "react";
import { Folder, MessageSquare, CheckSquare, Settings, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Toast from "./Toast";
import "../styles/Sidebar.css";
import { AuthContext } from "../context/AuthContext";


export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useContext(AuthContext); 

  const [toast, setToast] = useState(null);

  const handleLogout = () => {
    logout();
    setToast({ msg: "Sesión cerrada correctamente 👋", type: "success" });

    // Espera a que el mensaje se muestre antes de redirigir
    setTimeout(() => {
    setToast(null); // cierra el toast antes de navegar
    navigate("/login", { replace: true });
    }, 2500); // 2.5 segundos de visibilidad total

  };


  return (
    <aside className="sb">
      <div className="sb-avatar">PS</div>

      <nav className="sb-nav">
        <button
          className={`sb-btn ${location.pathname === "/proyectos" ? "sb-active" : ""}`}
          title="Proyectos"
          onClick={() => navigate("/proyectos")}
        >
          <Folder />
        </button>

        <button
          className={`sb-btn ${location.pathname === "/chat" ? "sb-active" : ""}`}
          title="Chat"
          onClick={() => navigate("/chat")}
        >
          <MessageSquare />
        </button>

        <button className="sb-btn" title="Tareas">
          <CheckSquare />
        </button>

        <button className="sb-btn" title="Ajustes">
          <Settings />
        </button>
      </nav>

      <div className="sb-bottom">
        <button className="sb-btn" title="Salir" onClick={handleLogout}>
          <LogOut />
        </button>
      </div>
    </aside>
  );
}
