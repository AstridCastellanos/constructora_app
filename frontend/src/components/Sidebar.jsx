import React from "react";
import { Folder, MessageSquare, CheckSquare, Settings, LogOut } from "lucide-react";
import "../styles/Sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sb">
      <div className="sb-avatar">PS</div>

      <nav className="sb-nav">
        <button className="sb-btn" title="Proyectos">
          <Folder />
        </button>
        <button className="sb-btn sb-active" title="Chat">
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
        <button className="sb-btn" title="Salir">
          <LogOut />
        </button>
      </div>
    </aside>
  );
}
