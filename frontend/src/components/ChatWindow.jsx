import React, { useEffect, useState, useRef } from "react";
import { Send, Paperclip, ArrowLeft, Download, ChevronDown, Info } from "lucide-react";
import ProyectoDetalles from "./ProyectoDetalles";
import "../styles/ChatWindow.css";
import { io } from "socket.io-client";

export default function ChatWindow({ project, onBack }) {
  const [mensajes, setMensajes] = useState([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [mostrarDetalles, setMostrarDetalles] = useState(false); // 👈 NUEVO

  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const socket = useRef(null);

  // 🟦 Usuario logueado (debe ir antes de los efectos que lo usan)
  const usuarioActual = JSON.parse(localStorage.getItem("usuario")) || {};

  // conexión WebSocket
  useEffect(() => {
    socket.current = io("http://localhost:4000");
    return () => socket.current.disconnect();
  }, []);

  // escuchar mensajes del proyecto actual
  useEffect(() => {
    if (!socket.current) return;

    const handler = (msg) => {
      if (msg.id_proyecto === project._id || msg.id_proyecto?._id === project._id) {
        setMensajes((prev) => [...prev, msg]);

        const esPropio =
          msg.autor_id?._id === usuarioActual._id ||
          msg.autor_id?.usuario_sistema === usuarioActual.usuario_sistema;

        if (isAtBottom || esPropio) {
          scrollToBottom();
        } else {
          setHasNewMessage(true);
        }
      }
    };

    socket.current.on("mensaje-actualizado", handler);
    return () => socket.current.off("mensaje-actualizado", handler);
  }, [project, isAtBottom, usuarioActual]);

  // Función para bajar al final del chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Solo bajar automáticamente si el usuario está al fondo o si el mensaje nuevo es propio
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [mensajes, isAtBottom]);

  // Cargar mensajes reales del proyecto
  useEffect(() => {
    if (!project?._id) return;
    fetch(`http://localhost:4000/api/mensajes/proyecto/${project._id}`)
      .then((res) => res.json())
      .then((data) => setMensajes(data))
      .catch((err) => console.error("Error al obtener mensajes:", err));
  }, [project]);

  // Función para obtener iniciales
  const getInitials = (nombreCompleto) => {
    if (!nombreCompleto) return "U";
    const partes = nombreCompleto.trim().split(" ");
    const inicial1 = partes[0]?.[0] || "";
    const inicial2 = partes[1]?.[0] || "";
    return (inicial1 + inicial2).toUpperCase();
  };

  // Manejar envío de mensaje (texto o archivo)
  const send = async (e) => {
    e.preventDefault();
    if (!message.trim() && !file) return;

    let archivosSubidos = [];

    try {
      // Si hay archivo, primero súbelo a Cloudinary
      if (file) {
        const formData = new FormData();
        formData.append("archivo", file);

        const res = await fetch("http://localhost:4000/api/archivos/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        // Normalizamos tipo de archivo (imagen / pdf / docx)
        let tipoArchivo = "otros";
        if (data.tipo.includes("image")) tipoArchivo = "imagen";
        else if (data.tipo.includes("pdf")) tipoArchivo = "pdf";
        else if (data.tipo.includes("word") || data.tipo.includes("officedocument"))
          tipoArchivo = "docx";

        archivosSubidos.push({
          url: data.url,
          public_id: data.public_id,
          nombre: data.nombre,
          tipo: tipoArchivo,
          tamaño: data.tamaño,
        });
      }

      // Enviar mensaje a la BD
      const body = {
        id_proyecto: project._id,
        autor_id: usuarioActual._id || usuarioActual.id,
        contenido: message.trim(),
        archivos: archivosSubidos,
      };

      const resMensaje = await fetch("http://localhost:4000/api/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const nuevo = await resMensaje.json();

      // Actualizar vista sin recargar
      socket.current?.emit("nuevo-mensaje", nuevo);
      setMessage("");
      setFile(null);
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    }
  };

  // Detectar si el usuario está viendo los mensajes antiguos
  const handleScroll = () => {
    const el = chatBodyRef.current;
    if (!el) return;

    // Si está a menos de 100px del fondo, lo consideramos "abajo"
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setIsAtBottom(atBottom);
  };

  // 👉 NUEVO: mostrar detalles del proyecto
  if (mostrarDetalles) {
    return (
      <ProyectoDetalles
        proyecto={project}
        modo="chat"
        onBack={() => setMostrarDetalles(false)}
      />
    );
  }

  return (
    <div className="cw">
      <header className="cw-head">
        {onBack && (
          <button className="cw-back" onClick={onBack} title="Regresar">
            <ArrowLeft />
          </button>
        )}
        <div className="cw-title">{project?.nombre}</div>
        <button
          className="cw-info"
          title="Ver detalles del proyecto"
          onClick={() => setMostrarDetalles(true)} // 👈 NUEVO
        >
          <Info size={20} />
        </button>
      </header>

      <main className="cw-body" ref={chatBodyRef} onScroll={handleScroll}>
        {mensajes.length > 0 ? (
          mensajes.map((m) => {
            const esPropio =
              m.autor_id?._id === usuarioActual._id ||
              m.autor_id?.usuario_sistema === usuarioActual.usuario_sistema;

            const nombre = m.autor_id?.nombres || "Usuario";
            const usuario = m.autor_id?.usuario_sistema || "sin_usuario";
            const iniciales = getInitials(nombre);

            return (
              <div key={m._id} className={`bubble ${esPropio ? "me" : "other"}`}>
                <div className="b-header">
                  <div
                    className="b-avatar-circle"
                    style={{
                      background: esPropio ? "#9ec2e6" : "#b7d5cf",
                    }}
                  >
                    {iniciales}
                  </div>
                  <div className="b-info">
                    <div className="b-name">{nombre}</div>
                    <div className="b-user">@{usuario}</div>
                  </div>
                </div>

                <div className="b-text">{m.contenido}</div>

                {m.archivos && m.archivos.length > 0 && (
                  <div className="b-files">
                    {m.archivos.map((file, i) => {
                      const tipo = file.tipo;

                      // Si es imagen, mostrar miniatura directamente
                      if (tipo === "imagen" || tipo?.includes("image")) {
                        return (
                          <div key={i} className="b-image-wrapper">
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={file.url}
                                alt={file.nombre}
                                className="b-file-thumb"
                              />
                            </a>

                            <a
                              href={`http://localhost:4000/api/mensajes/archivo/${file.public_id}?download=true`}
                              rel="noopener noreferrer"
                              className="b-download-icon"
                              title="Descargar imagen"
                            >
                              <Download size={18} />
                            </a>
                          </div>
                        );
                      }

                      // Si es PDF o DOCX, mostrar acciones de ver y descargar
                      return (
                        <div
                          key={i}
                          className="b-file-icon"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <a
                            href={`http://localhost:4000/api/mensajes/archivo/${file.public_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#007bff",
                              textDecoration: "none",
                              fontWeight: "500",
                              cursor: "pointer",
                            }}
                          >
                            {file.nombre}
                          </a>
                          <a
                            href={`http://localhost:4000/api/mensajes/archivo/${file.public_id}?download=true`}
                            title="Descargar archivo"
                            rel="noopener noreferrer"
                            style={{ color: "#555" }}
                          >
                            <Download size={18} />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="b-time">
                  {new Date(m.fecha_envio).toLocaleString("es-GT")}
                </div>
              </div>
            );
          })
        ) : (
          <p className="cw-empty">No hay mensajes para este proyecto.</p>
        )}
        <div ref={messagesEndRef} />
      </main>

      {!isAtBottom && (
        <button
          className={`cw-scroll-down ${hasNewMessage ? "has-new" : ""}`}
          onClick={() => {
            scrollToBottom();
            setHasNewMessage(false);
          }}
          title="Bajar al último mensaje"
        >
          <ChevronDown size={22} />
        </button>
      )}

      <form className="cw-input" onSubmit={send}>
        <div className="cw-field">
          <label htmlFor="fileInput" className="cw-attach" title="Adjuntar archivo">
            <Paperclip size={20} />
          </label>
          <input
            id="fileInput"
            type="file"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files[0])}
          />
          <input
            placeholder={
              file ? `Archivo listo: ${file.name}` : "Escribe un mensaje"
            }
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
