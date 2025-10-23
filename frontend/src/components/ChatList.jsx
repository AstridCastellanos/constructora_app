import React, { useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import "../styles/ChatList.css";

export default function ChatList({ onSelect, selected }) {
  const [proyectos, setProyectos] = useState([]);
  const [filtro, setFiltro] = useState("");

  // Cargar proyectos reales desde el backend
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:4000/api/proyectos", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProyectos(data))
      .catch((err) => console.error("Error al obtener proyectos:", err));
  }, []);

  // Filtrado básico
  const proyectosFiltrados = proyectos.filter((p) =>
    p.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="cl">
      <div className="cl-title">Constructora P.S</div>

      <div className="cl-search">
        <button className="cl-search" title="Buscar">
          <Search />
        </button>
        <input
          placeholder="Buscar proyecto"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <button className="cl-filter" title="Filtros">
          <SlidersHorizontal />
        </button>
      </div>

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
