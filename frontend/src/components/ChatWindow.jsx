import React, { useEffect, useState, useRef } from "react";
import {
  Send,
  Paperclip,
  ArrowLeft,
  Download,
  ChevronDown,
  FileText,
  X, 
} from "lucide-react";
import ProyectoDetalles from "./ProyectoDetalles";
import "../styles/ChatWindow.css";
import { io } from "socket.io-client";
import { useIsMobile } from "../hooks/useIsMobile"; 

export default function ChatWindow({ project, onBack }) {
  const [mensajes, setMensajes] = useState([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const socket = useRef(null);
  const isMobile = useIsMobile(); 

  const usuarioActual = JSON.parse(localStorage.getItem("usuario")) || {};

  // Conexión WebSocket
  useEffect(() => {
    socket.current = io("http://localhost:4000");
    return () => socket.current.disconnect();
  }, []);

  // Escuchar mensajes del proyecto actual
  useEffect(() => {
    if (!socket.current) return;

    const handler = (msg) => {
      if (
        msg.id_proyecto === project._id ||
        msg.id_proyecto?._id === project._id
      ) {
        setMensajes((prev) => [...prev, msg]);

        const esPropio = isOwnMessage(msg, usuarioActual);

        if (isAtBottom || esPropio) scrollToBottom();
        else setHasNewMessage(true);
      }
    };

    socket.current.on("mensaje-actualizado", handler);
    return () => socket.current.off("mensaje-actualizado", handler);
  }, [project, isAtBottom, usuarioActual]);

  // Bajar automáticamente
  const scrollToBottom = ({ instant = false } = {}) => {
    const el = chatBodyRef.current;
    if (!el) return;

    const top = el.scrollHeight; // valor definitivo del fondo
    if (instant) {
      el.scrollTop = top;                 
    } else {
      el.scrollTo({ top, behavior: "smooth" }); // smooth para acciones del usuario
    }
  };

  // al montar el componente, baja al final después de que el DOM haya calculado alturas
  useEffect(() => {
    // Dos requestAnimationFrame garantizan que se haya pintado y medido el layout
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToBottom({ instant: true }));
    });
  }, []);

  useEffect(() => {
    if (!isAtBottom) return;
      // Espera a que React pinte el nuevo mensaje y calcule alturas
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToBottom({ instant: true }));
      });
    }, [mensajes, isAtBottom]);

  // Nuevo: volver a bajar cuando cargan imágenes/adjuntos que modifican la altura del contenedor
  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;

    // Si ya estabas al fondo, baja de nuevo tras la pintura
    if (isAtBottom) {
      requestAnimationFrame(() => scrollToBottom({ instant: true }));
    }

    const imgs = el.querySelectorAll("img.b-file-thumb");
    let pending = 0;

    const onImgSettled = () => {
      pending--;
      if (pending <= 0 && isAtBottom) {
        scrollToBottom({ instant: true });
      }
    };

    imgs.forEach((img) => {
      if (img.complete) return;
      pending++;
      img.addEventListener("load", onImgSettled);
      img.addEventListener("error", onImgSettled);
    });

    return () => {
      imgs.forEach((img) => {
        img.removeEventListener("load", onImgSettled);
        img.removeEventListener("error", onImgSettled);
      });
    };
  }, [mensajes, isAtBottom]);

  // Nuevo: mantener el scroll al fondo si cambia el tamaño del contenedor (por CSS o cambios de layout)
  useEffect(() => {
    if (!chatBodyRef.current) return;
    const el = chatBodyRef.current;
    const ro = new ResizeObserver(() => {
      if (isAtBottom) scrollToBottom({ instant: true });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isAtBottom]);

  // Cargar mensajes del proyecto
  useEffect(() => {
    if (!project?._id) return;
    fetch(`http://localhost:4000/api/mensajes/proyecto/${project._id}`)
      .then((res) => res.json())
      .then((data) => setMensajes(data))
      .catch((err) => console.error("Error al obtener mensajes:", err));
  }, [project]);

  // Cuando regresamos desde detalles a la vista de chat, forzar scroll al final
  useEffect(() => {
    if (!mostrarDetalles) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToBottom({ instant: true }));
      });
    }
  }, [mostrarDetalles]);

  // Función para obtener iniciales
  const getInitials = (nombreCompleto) => {
    if (!nombreCompleto) return "U";
    const partes = nombreCompleto.trim().split(" ");
    const inicial1 = partes[0]?.[0] || "";
    const inicial2 = partes[1]?.[0] || "";
    return (inicial1 + inicial2).toUpperCase();
  };

  // Enviar mensaje
  const send = async (e) => {
    e.preventDefault();
    if (!message.trim() && !file) return;

    let archivosSubidos = [];

    try {
      if (file) {
        const formData = new FormData();
        formData.append("archivo", file);

        const res = await fetch("http://localhost:4000/api/archivos/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        let tipoArchivo = "otros";
        if (data.tipo.includes("image")) tipoArchivo = "imagen";
        else if (data.tipo.includes("pdf")) tipoArchivo = "pdf";
        else if (
          data.tipo.includes("word") ||
          data.tipo.includes("officedocument")
        )
          tipoArchivo = "docx";
        else if (data.tipo.includes("video")) tipoArchivo = "video"; // permitir video

        archivosSubidos.push({
          url: data.url,
          public_id: data.public_id,
          nombre: data.nombre,
          tipo: tipoArchivo,
          tamaño: data.tamaño,
        });
      }

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

      socket.current?.emit("nuevo-mensaje", nuevo);
      setMessage("");
      setFile(null);
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    }
  };

  // Detectar si el usuario está viendo mensajes antiguos
  const handleScroll = () => {
    const el = chatBodyRef.current;
    if (!el) return;

    const atBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) <= 1;
    setIsAtBottom(atBottom);
  };

  // Mostrar detalles del proyecto
  if (mostrarDetalles) {
    return (
      <ProyectoDetalles
        proyecto={project}
        modo="chat"
        onBack={() => setMostrarDetalles(false)}
      />
    );
  }

  // --- Helpers para el link de descarga/visualización con el resource_type correcto
  const rtFromTipo = (tipo) => {
    if (!tipo) return "raw";
    if (tipo === "imagen" || String(tipo).includes("image")) return "image";
    if (tipo === "video"  || String(tipo).includes("video"))  return "video";
    return "raw"; // pdf, docx, xlsx, pptx, txt, etc.
  };

  const buildDownloadHref = (publicId, tipo, download = true) => {
    const rt = rtFromTipo(tipo);
    const base = `http://localhost:4000/api/mensajes/archivo/${encodeURIComponent(publicId)}`;
    const qs = `rt=${rt}${download ? "&download=true" : ""}`;
    return `${base}?${qs}`;
  };

  const isOwnMessage = (msg, user) => {
    const msgId = String(
      msg?.autor_id?._id ??
      msg?.autor_id?.id ??
      msg?.autor_id // por si el backend manda el id directo
    );

    const userId = String(user?._id ?? user?.id ?? "");

    const msgUser = (msg?.autor_id?.usuario_sistema || "").toLowerCase();
    const userUser = (user?.usuario_sistema || "").toLowerCase();

    // compara por id si existe, si no, por usuario_sistema normalizado
    return (!!msgId && !!userId && msgId === userId) ||
          (!!msgUser && !!userUser && msgUser === userUser);
  };

  return (
    <div className="cw">
      <header className="cw-head">
        {/* Solo mostrar la flecha si estamos en móvil y venimos desde ChatPage */}
        {isMobile && onBack && (
          <button className="cw-back" onClick={onBack} title="Regresar">
            <ArrowLeft />
          </button>
        )}

        <div className="cw-title">{project?.nombre}</div>

        <button
          className="cw-details"
          title="Ver detalles del proyecto"
          onClick={() => setMostrarDetalles(true)}
        >
          <FileText size={20} />
        </button>
      </header>

      <main className="cw-body" ref={chatBodyRef} onScroll={handleScroll}>
        {mensajes.length > 0 ? (
          mensajes.map((m) => {
            const esPropio = isOwnMessage(m, usuarioActual);

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

                {m.archivos?.length > 0 && (
                  <div className="b-files">
                    {m.archivos.map((file, i) => {
                      const tipo = file.tipo;

                      if (tipo === "imagen" || tipo?.includes("image")) {
                        return (
                          <div key={i} className="b-image-wrapper">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={file.url}
                                alt={file.nombre}
                                className="b-file-thumb"
                              />
                            </a>

                            <a
                              href={buildDownloadHref(file.public_id, tipo, true)}
                              rel="noopener noreferrer"
                              className="b-download-icon"
                              title="Descargar"
                            >
                              <Download size={18} />
                            </a>
                          </div>
                        );
                      }

                      // Nuevo: soporte de video
                      if (tipo === "video" || tipo?.includes("video")) {
                        return (
                          <div key={i} className="b-video-wrapper">
                            <video
                              className="b-video"
                              src={file.url}
                              controls
                              playsInline
                            />
                            <a
                              href={buildDownloadHref(file.public_id, tipo, false)}
                              title="Descargar video"
                              rel="noopener noreferrer"
                              className="b-download-icon"
                            >
                              <Download size={18} />
                            </a>
                          </div>
                        );
                      }

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
                            href={buildDownloadHref(file.public_id, tipo, false)}
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
                            href={buildDownloadHref(file.public_id, tipo, true)}
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
        {/* Pastilla visible del archivo adjunto */}
        {file && (
          <div className="cw-attach-chip" role="status" aria-live="polite">
            <span className="cw-attach-name">{file.name}</span>
            <button
              type="button"
              className="cw-attach-remove"
              onClick={() => setFile(null)}
              aria-label="Quitar adjunto"
              title="Quitar adjunto"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="cw-field">
          <label
            htmlFor="fileInput"
            className="cw-attach"
            title="Adjuntar archivo"
          >
            <Paperclip size={20} />
          </label>
          <input
            id="fileInput"
            type="file"
            style={{ display: "none" }}
            // Aceptar los formatos que ya tienes en backend + video
            accept="
              image/jpeg,image/png,image/gif,image/webp,image/svg+xml,
              application/pdf,
              application/msword,
              application/vnd.openxmlformats-officedocument.wordprocessingml.document,
              application/vnd.ms-excel,
              application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
              application/vnd.ms-powerpoint,
              application/vnd.openxmlformats-officedocument.presentationml.presentation,
              text/plain,
              video/mp4,video/webm,video/quicktime
            "
            onChange={(e) => setFile(e.target.files[0])}
          />
          <input
            placeholder={"Escribe un mensaje"}
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
