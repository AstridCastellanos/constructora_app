import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import ProyectoDetalles from "../components/ProyectoDetalles";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/ProyectoForm.css";

export default function ProyectoDetallesPage() {
  const { id } = useParams();
  const [proyecto, setProyecto] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`http://localhost:4000/api/proyectos/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProyecto(data))
      .catch((err) => console.error("Error al obtener proyecto:", err));
  }, [id]);

  if (!proyecto) {
    return (
      <div className="layout">
        <Sidebar />
        <section className="proyectos-col">
          <p>Cargando proyecto...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar />
      <section className="proyectos-col">
        <ProyectoDetalles
          proyecto={proyecto}
          modo="page"
          onOpenChat={(proy) => navigate("/chat", { state: { proyecto: proy } })}
        />
      </section>
    </div>
  );
}
