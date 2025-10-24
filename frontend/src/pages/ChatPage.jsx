import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import EmptyChat from "../components/EmptyChat";
import { useIsMobile } from "../hooks/useIsMobile";
import "../styles/ChatPage.css";

export default function ChatPage() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Detectar si venimos desde ProyectoDetalles (por estado)
  useEffect(() => {
    const projectId = location.state?.projectId;
    if (projectId) {
      setLoadingProject(true);
      fetch(`http://localhost:4000/api/proyectos/${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          setSelectedProject(data);
          setLoadingProject(false);
        })
        .catch((err) => {
          console.error("Error al abrir chat del proyecto:", err);
          setLoadingProject(false);
        });
    }
  }, [location.state]);

  // Mostrar cargando si aún está trayendo el proyecto
  if (loadingProject) {
    return (
      <div className="chat-layout">
        <Sidebar />
        <section className="chat-col">
          <div className="loading-chat">
            <p>Cargando chat del proyecto...</p>
          </div>
        </section>
      </div>
    );
  }

  // VISTA ESCRITORIO
  if (!isMobile) {
    return (
      <div className="chat-layout">
        <Sidebar />
        <section className="list-col">
          {/* El listado siempre se muestra */}
          <ChatList
            onSelect={setSelectedProject}
            selected={selectedProject}
          />
        </section>

        <section className="chat-col">
          {/* Si hay proyecto seleccionado, muestra el chat */}
          {selectedProject ? (
            <ChatWindow project={selectedProject} />
          ) : (
            <EmptyChat />
          )}
        </section>
      </div>
    );
  }

  // VISTA MÓVIL
  return (
    <div className="layout-mobile">
      {!selectedProject ? (
        <ChatList onSelect={setSelectedProject} />
      ) : (
        <ChatWindow
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}
