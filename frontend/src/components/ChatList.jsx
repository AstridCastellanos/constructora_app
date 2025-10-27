import React, { useEffect, useState, useContext } from "react";
import { Search, SlidersHorizontal, LogOut } from "lucide-react";
import "../styles/ChatList.css";
import { AuthContext } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { getSocket, joinUserRoom } from "../utils/socketClient";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ChatList({ onSelect, selected }) {
  const [proyectos, setProyectos] = useState([]);
  const [filtro, setFiltro] = useState("");

  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("En Curso");
  const [ordenNombre, setOrdenNombre] = useState("asc");

  // Badges por proyecto (id -> count)
  const [badges, setBadges] = useState({});

  const { logout, usuario } = useContext(AuthContext);
  const isMobile = useIsMobile();

  // Cargar proyectos (scope=chat)
  const loadProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/proyectos?scope=chat`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.status === 403 ? [] : await res.json();
      setProyectos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al obtener proyectos:", err);
    }
  };

  // Cargar badges: agrupa notificaciones chat_mensaje por id_proyecto
  const loadChatBadges = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/notificaciones?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : (data?.items || data?.notificaciones || data?.results || data?.rows || data?.docs || []);

      const map = {};
      for (const n of arr) {
        if (n.tipo !== "chat_mensaje") continue;
        const pid = n.id_proyecto && (n.id_proyecto._id || n.id_proyecto);
        if (!pid) continue;
        map[pid] = (map[pid] || 0) + 1;
      }
      setBadges(map);
    } catch (err) {
      console.error("Error al cargar badges de chat:", err);
      setBadges({});
    }
  };

  // Limpiar notificaciones de chat para un proyecto
  const clearProjectChatNotifs = async (projectId) => {
    // Optimista: baja a 0 de inmediato
    setBadges((prev) => ({ ...prev, [projectId]: 0 }));
    window.dispatchEvent(new Event("notifs:refresh")); // refresca badge global

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/notificaciones/read-all`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tipo: "chat_mensaje", id_proyecto: projectId }),
      });
      if (!res.ok) {
        // Si falla, recargamos los badges reales para no quedar desincronizados
        await loadChatBadges();
      }
    } catch (err) {
      console.error("Error al limpiar notificaciones del proyecto:", err);
      await loadChatBadges();
    }
  };

  // Mount: proyectos + badges
  useEffect(() => {
    loadProjects();
    loadChatBadges();
    const id = setInterval(loadChatBadges, 30000);
    return () => clearInterval(id);
  }, []);

  // Socket realtime: refrescar badges cuando llegue una notificación
  useEffect(() => {
    if (!usuario) return;
    const s = getSocket();
    joinUserRoom(usuario);
    const handleNew = () => loadChatBadges();
    s.on("notificaciones:nueva", handleNew);
    return () => s.off("notificaciones:nueva", handleNew);
  }, [usuario]);

  // Filtrado por texto + estado + orden
  const proyectosFiltrados = proyectos
    .filter((p) => p.nombre?.toLowerCase().includes(filtro.toLowerCase()))
    .filter((p) => (filtroEstado ? p.estado === filtroEstado : true))
    .sort((a, b) => {
      const an = (a.nombre || "").toLowerCase();
      const bn = (b.nombre || "").toLowerCase();
      if (an < bn) return ordenNombre === "asc" ? -1 : 1;
      if (an > bn) return ordenNombre === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div className="cl">
      {/* Header */}
      <div className="cl-header">
        <div className="cl-title">Constructora P.S</div>

        {isMobile && (
          <button
            className="sb-btn"
            title="Salir"
            onClick={logout}
            aria-label="Salir"
          >
            <LogOut />
          </button>
        )}
      </div>

      {/* Search + filtros */}
      <div className="cl-search">
        <button className="cl-search" title="Buscar" aria-hidden>
          <Search />
        </button>
        <input
          placeholder="Buscar proyecto"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          aria-label="Buscar proyecto"
        />
        <button
          className="cl-filter"
          title="Filtros"
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
          aria-controls="cl-filters"
        >
          <SlidersHorizontal />
        </button>
      </div>

      {showFilters && (
        <div className="cl-filters" id="cl-filters">
          <label className="cl-filter-field">
            <span>Estado</span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos</option>
              <option>En Curso</option>
              <option>Finalizado</option>
              <option>Pausado</option>
              <option>Cancelado</option>
            </select>
          </label>

          <label className="cl-filter-field">
            <span>Ordenar por nombre</span>
            <select
              value={ordenNombre}
              onChange={(e) => setOrdenNombre(e.target.value)}
            >
              <option value="asc">Ascendente (A-Z)</option>
              <option value="desc">Descendente (Z-A)</option>
            </select>
          </label>
        </div>
      )}

      {/* Lista */}
      <div className="cl-list">
        {proyectosFiltrados.length > 0 ? (
          proyectosFiltrados.map((p) => {
            const initials = p.nombre
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("");
            const isSel = selected && selected._id === p._id;
            const badge = badges[p._id] || 0;

            return (
              <button
                key={p._id}
                className={`cl-item ${isSel ? "cl-item--active" : ""}`}
                onClick={() => {
                  onSelect(p);
                  clearProjectChatNotifs(p._id);
                }}
              >
                <div className="cl-avatar">{initials}</div>
                <div className="cl-info">
                  <div className="cl-name-row">
                    <div className="cl-name">{p.nombre}</div>
                    {badge > 0 && <span className="cl-badge">{badge}</span>}
                  </div>
                  {p.estado && <div className="cl-meta">{p.estado}</div>}
                </div>
              </button>
            );
          })
        ) : (
          <div className="cl-empty">No hay proyectos</div>
        )}
      </div>
    </div>
  );
}
