import React, { useEffect, useState, useContext } from "react";
import { Search, SlidersHorizontal, LogOut } from "lucide-react";
import "../styles/ChatList.css";
import { AuthContext } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";

export default function ChatList({ onSelect, selected }) {
  const [proyectos, setProyectos] = useState([]);
  const [filtro, setFiltro] = useState("");

  // Nuevo: para mostrar/ocultar el panel de filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("En Curso"); // En Curso | Finalizado | Pausado | Cancelado | ""
  const [ordenNombre, setOrdenNombre] = useState("asc"); // asc | desc

  const { logout } = useContext(AuthContext);
  const isMobile = useIsMobile();

  // Cargar proyectos del backend (ya filtrará por rol con scope=chat del lado del server)
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:4000/api/proyectos?scope=chat", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 403) return [];
        return res.json();
      })
      .then((data) => setProyectos(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error al obtener proyectos:", err));
  }, []);

  // Filtrado por texto + estado
  const proyectosFiltrados = proyectos
    .filter((p) =>
      p.nombre?.toLowerCase().includes(filtro.toLowerCase())
    )
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
      {/* Header: título a la izquierda y botón salir a la derecha (solo móvil) */}
      <div className="cl-header">
        <div className="cl-title">Constructora P.S</div>

        {isMobile && (
          <button
            className="sb-btn"        // mismo estilo que Sidebar
            title="Salir"
            onClick={logout}
            aria-label="Salir"
          >
            <LogOut />
          </button>
        )}
      </div>

      {/* Barra de búsqueda + botón de filtros (lo de filtros NO se movió) */}
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
          onClick={() => setShowFilters((s) => !s)} // ahora sí abre/cierra el panel
          aria-expanded={showFilters}
          aria-controls="cl-filters"
        >
          <SlidersHorizontal />
        </button>
      </div>

      {/* Panel de filtros: Estado + Orden por nombre */}
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

            return (
              <button
                key={p._id}
                className={`cl-item ${isSel ? "cl-item--active" : ""}`}
                onClick={() => onSelect(p)}
              >
                <div className="cl-avatar">{initials}</div>
                <div className="cl-info">
                  <div className="cl-name">{p.nombre}</div>
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
