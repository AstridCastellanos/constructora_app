import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import ProyectoDetalles from "../components/ProyectoDetalles";
import ChatWindow from "../components/ChatWindow";
import { useParams } from "react-router-dom";
import "../styles/ProyectoForm.css";

export default function ProyectoDetallesPage() {
  const { id } = useParams();
  const [proyecto, setProyecto] = useState(null);
  const [verChat, setVerChat] = useState(false);

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
        {!verChat ? (
          <ProyectoDetalles
            proyecto={proyecto}
            modo="page"
            onOpenChat={() => setVerChat(true)}
          />
        ) : (
          <ChatWindow
            key={proyecto._id}        
            project={proyecto}
            onBack={() => setVerChat(false)}
          />
        )}
      </section>
    </div>
  );
}
