import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import "../styles/ChatList.css";

export default function ChatList({ onSelect, selected }) {
  const proyectos = [
    { id: 1, nombre: "Remodelación Oficina Central" },
    { id: 2, nombre: "Construcción Vivienda Familiar" },
    { id: 3, nombre: "Condominio Vista Verde" },
    { id: 4, nombre: "Centro Comercial Plaza del Sol" },
    { id: 5, nombre: "Edificio Corporativo Aurora" },
    { id: 6, nombre: "Residencial Las Lomas" },
  ];

  return (
    <div className="cl">
      <div className="cl-title">Constructora P.S</div>

      <div className="cl-search">
        <Search />
        <input placeholder="Buscar proyecto" />
        <button className="cl-filter" title="Filtros">
          <SlidersHorizontal />
        </button>
      </div>

      <div className="cl-list">
        {proyectos.map((p) => {
          const initials = p.nombre
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join("");
          const isSel = selected && selected.id === p.id;
          return (
            <button
              key={p.id}
              className={`cl-item ${isSel ? "cl-item--active" : ""}`}
              onClick={() => onSelect(p)}
            >
              <div className="cl-avatar">{initials}</div>
              <div className="cl-info">
                <div className="cl-name">{p.nombre}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
