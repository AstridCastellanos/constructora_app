import React, { useEffect, useRef, useState, useContext } from "react";
import {
  Folder, MessageSquare, CheckSquare, Settings, LogOut, Bell
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Toast from "./Toast";
import "../styles/Sidebar.css";
import { AuthContext } from "../context/AuthContext";
import NotificationsPopover from "./NotificationsPopover";
import { getSocket, joinUserRoom } from "../utils/socketClient";
const API = import.meta.env.VITE_API_BASE_URL;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, usuario } = useContext(AuthContext);
  const roles = usuario?.roles || [];

  const [toast, setToast] = useState(null);
  const [openNotif, setOpenNotif] = useState(false);
  const [counts, setCounts] = useState({ total: 0, chat: 0, aprobaciones: 0 });
  const notifBtnRef = useRef(null);

  const puedeVer = (vista) => {
    if (roles.includes("titular")) return true;
    if (vista === "proyectos" && roles.includes("colaborador")) return true;
    if (vista === "chat" && (roles.includes("colaborador") || roles.includes("cliente"))) return true;
    if (vista === "ajustes" && roles.includes("administrador")) return true;
    if (vista === "solicitudes" && (roles.includes("titular") || roles.includes("colaborador"))) return true;
    if (vista === "notificaciones" && (roles.includes("titular") || roles.includes("colaborador"))) return true;
    return false;
  };

  const handleLogout = () => {
    logout();
    setToast({ msg: "Sesión cerrada correctamente", type: "success" });
    setTimeout(() => {
      setToast(null);
      navigate("/login", { replace: true });
    }, 2500);
  };

  const loadCounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/notificaciones/counts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCounts(data && typeof data === "object" ? data : { total: 0, chat: 0, aprobaciones: 0 });
    } catch {
      setCounts({ total: 0, chat: 0, aprobaciones: 0 });
    }
  };

  useEffect(() => {
    if (!puedeVer("notificaciones")) return;
    loadCounts();
    const id = setInterval(loadCounts, 30000);
    return () => clearInterval(id);
  }, [usuario && usuario._id, roles.join(",")]);

  // Escucha evento global para refrescar badge 
  useEffect(() => {
    const onRefresh = () => loadCounts();
    window.addEventListener("notifs:refresh", onRefresh);
    return () => window.removeEventListener("notifs:refresh", onRefresh);
  }, []);

  // Socket en Sidebar para actualizar badge en tiempo real 
  useEffect(() => {
    if (!puedeVer("notificaciones")) return;
    if (!usuario) return;

    const s = getSocket();
    joinUserRoom(usuario);

    const handleNew = () => loadCounts();
    s.on("notificaciones:nueva", handleNew);

    // Limpieza: quitar listener 
    return () => {
      s.off("notificaciones:nueva", handleNew);
    };
  }, [usuario && (usuario._id || usuario.id), roles.join(",")]);

  // Refrescar cuando se cierre el popover 
  useEffect(() => {
    if (!openNotif) loadCounts();
  }, [openNotif]);

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

        {puedeVer("notificaciones") && (
          <button
            ref={notifBtnRef}
            className="sb-btn"
            title="Notificaciones"
            onClick={() => setOpenNotif((v) => !v)}
          >
            <Bell />
            {counts?.total > 0 && <span className="sb-badge sb-badge--red">{counts.total}</span>}
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

      <NotificationsPopover
        open={openNotif}
        onClose={() => setOpenNotif(false)}
        anchorRef={notifBtnRef}
        usuario={usuario}
      />
    </aside>
  );
}
