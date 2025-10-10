import React, { useState } from "react";
import { Send, Paperclip, ArrowLeft  } from "lucide-react";
import "../styles/ChatWindow.css";

export default function ChatWindow({ project, onBack }) {
  const [message, setMessage] = useState("");

  const messages = [
    {
      id: 1,
      propio: false,
      autor: "Carla Ferris",
      usuario: "carla_ferris",
      texto: "Hola! Buen día, Arqui. Hoy irá a supervisar la obra?",
      hora: "12/05/21, 8:30 a. m.",
      foto: "../assets/avatar_carla.png",
    },
    {
      id: 2,
      propio: true,
      autor: "Tú",
      usuario: "arq_principal",
      texto: "Hola! Buen día. Sí, ya en camino a la construcción.",
      hora: "12/05/21, 8:31 a. m.",
      foto: "../assets/avatar_arqui.png",
    },
  ];

  const send = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessage("");
  };

  return (
    <div className="cw">
      <header className="cw-head">
        {onBack && (
          <button className="cw-back" onClick={onBack} title="Regresar">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="cw-title">{project?.nombre}</div>
      </header>

      <main className="cw-body">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.propio ? "me" : "other"}`}>
            <div className="b-header">
              <div className="b-avatar">
                <img src={m.foto} alt={m.autor} />
              </div>
              <div className="b-info">
                <div className="b-name">{m.autor}</div>
                <div className="b-user">@{m.usuario}</div>
              </div>
            </div>
            <div className="b-text">{m.texto}</div>
            <div className="b-time">{m.hora}</div>
          </div>
        ))}
      </main>

      <form className="cw-input" onSubmit={send}>
        <div className="cw-field">
          <button type="button" className="cw-attach" title="Adjuntar archivo">
            <Paperclip size={20} />
          </button>
          <input
            placeholder="Escribe un mensaje"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="submit" className="cw-send" aria-label="Enviar">
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
