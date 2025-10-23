import React, { useState, useEffect } from "react";
import { ArrowLeft, MessageSquare, Upload, Download } from "lucide-react";
import ModalMensaje from "./ModalMensaje";
import "../styles/ProyectoForm.css";
import {
  onlyLettersNumbersSpaces,
  sanitizeText,
  onlyPositiveNumbers,
} from "../utils/inputValidators";

export default function ProyectoDetalles({ proyecto, modo = "page", onBack, onOpenChat }) {
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    direccion: "",
    presupuesto_aprox: "",
    saldo_abonado: "",
    estado: "En Curso",
    cliente: "",
    responsable: "",
  });

  const [usuarios, setUsuarios] = useState({
    clientes: [],
    responsables: [],
  });

  const [documentos, setDocumentos] = useState([]);
  const [archivo, setArchivo] = useState(null);

  const [modal, setModal] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
    tipo: "info",
    onAceptar: null,
    mostrarCancelar: false,
  });

  const mostrarModal = (config) => setModal({ visible: true, ...config });
  const cerrarModal = () => setModal({ ...modal, visible: false });

  // Cargar clientes y responsables
  useEffect(() => {
    const token = localStorage.getItem("token");

    Promise.all([
      fetch("http://localhost:4000/api/usuarios/clientes", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("http://localhost:4000/api/usuarios/responsables", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([resClientes, resResponsables]) => {
        const clientes = await resClientes.json();
        const responsables = await resResponsables.json();
        setUsuarios({ clientes, responsables });
      })
      .catch((err) => console.error("Error al cargar usuarios:", err));
  }, []);

  // Cargar datos del proyecto y documentos
  useEffect(() => {
    if (proyecto?._id) {
      const clienteObj = proyecto.participantes?.find(
        (p) => p.tipo_participante === "cliente"
      );
      const responsableObj = proyecto.participantes?.find(
        (p) => p.tipo_participante === "responsable"
      );

      setForm({
        nombre: proyecto.nombre || "",
        descripcion: proyecto.descripcion || "",
        direccion: proyecto.direccion || "",
        presupuesto_aprox: proyecto.presupuesto_aprox || "",
        saldo_abonado: proyecto.saldo_abonado || "",
        estado: proyecto.estado || "En Curso",
        cliente: clienteObj?.usuario_id?._id || "",
        responsable: responsableObj?.usuario_id?._id || "",
      });

      const token = localStorage.getItem("token");

      fetch(`http://localhost:4000/api/mensajes/proyecto/${proyecto._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();

          const adjuntos = data.flatMap((m) => m.archivos || []);
          const unicos = adjuntos.filter(
            (a, i, self) =>
              a.public_id &&
              self.findIndex((x) => x.public_id === a.public_id) === i
          );
          setDocumentos(unicos);
        })
        .catch((err) => console.error("Error al cargar documentos:", err));
    }
  }, [proyecto]);

  // Actualizar proyecto
  const handleUpdate = async (e) => {
    e.preventDefault();

    const etiquetas = {
      nombre: "Nombre del Proyecto",
      direccion: "Dirección",
      presupuesto_aprox: "Presupuesto Aproximado",
      cliente: "Cliente",
      responsable: "Responsable",
    };

    const camposRequeridos = Object.keys(etiquetas);
    for (const campo of camposRequeridos) {
      if (!form[campo] || form[campo].toString().trim() === "") {
        mostrarModal({
          titulo: "Campo obligatorio",
          mensaje: `El campo "${etiquetas[campo]}" es obligatorio.`,
          tipo: "warning",
          onAceptar: cerrarModal,
        });
        return;
      }
    }

    if (Number(form.presupuesto_aprox) <= 0) {
      mostrarModal({
        titulo: "Presupuesto inválido",
        mensaje: "El presupuesto debe ser mayor que cero.",
        tipo: "warning",
        onAceptar: cerrarModal,
      });
      return;
    }

    const token = localStorage.getItem("token");

    const body = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      direccion: form.direccion.trim(),
      presupuesto_aprox: Number(form.presupuesto_aprox),
      saldo_abonado: Number(form.saldo_abonado) || 0,
      estado: form.estado,
      participantes: [
        { usuario_id: form.cliente, tipo_participante: "cliente" },
        { usuario_id: form.responsable, tipo_participante: "responsable" },
      ],
    };

    try {
      const res = await fetch(
        `http://localhost:4000/api/proyectos/${proyecto._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (res.ok) {
        mostrarModal({
          titulo: "Proyecto actualizado",
          mensaje: "Los datos se actualizaron correctamente.",
          tipo: "success",
          onAceptar: cerrarModal,
        });
      } else {
        mostrarModal({
          titulo: "Error",
          mensaje: data.mensaje || "No se pudo actualizar el proyecto.",
          tipo: "error",
          onAceptar: cerrarModal,
        });
      }
    } catch (error) {
      console.error("Error al actualizar proyecto:", error);
      mostrarModal({
        titulo: "Error de conexión",
        mensaje: "No se pudo conectar con el servidor.",
        tipo: "error",
        onAceptar: cerrarModal,
      });
    }
  };

  // Subir documento nuevo (solo botón)
  const handleUploadClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("archivo", file);
      formData.append("id_proyecto", proyecto._id);

      try {
        const res = await fetch("http://localhost:4000/api/archivos/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (res.ok) {
          setDocumentos((prev) => [...prev, data]);
          mostrarModal({
            titulo: "Archivo cargado",
            mensaje: "El documento se adjuntó correctamente.",
            tipo: "success",
            onAceptar: cerrarModal,
          });
        } else {
          mostrarModal({
            titulo: "Error",
            mensaje: data.mensaje || "No se pudo subir el archivo.",
            tipo: "error",
            onAceptar: cerrarModal,
          });
        }
      } catch (err) {
        console.error("Error subiendo archivo:", err);
      }
    };
    input.click();
  };

  return (
    <div
      className={`proyecto-detalles ${
        modo === "page" ? "modo-page" : "modo-chat"
      }`}
    >
      {/* ENCABEZADO */}
    <header className="p-header detalles-header">
    {modo === "chat" ? (
        <>
        <h2 className="detalles-title">{proyecto?.nombre}</h2>
        <button
            className="icon-btn icon-chat"
            onClick={() => onBack && onBack(proyecto)} // 🔹 Regresa al chat del mismo proyecto
            title="Regresar al chat del proyecto"
        >
            <MessageSquare />
        </button>
        </>
    ) : (
        <>
        <h2 className="detalles-title">Detalles del Proyecto</h2>
        <button
            className="icon-btn icon-chat"
            onClick={() => onOpenChat && onOpenChat(proyecto)} // 🔹 Abre directamente el chat del proyecto
            title="Abrir chat del proyecto"
        >
            <MessageSquare />
        </button>
        </>
    )}
    </header>

      {/* FORMULARIO DE DETALLES */}
      <form className="form-proyecto" onSubmit={handleUpdate}>
        <div className="form-grid">
          <label>
            Nombre del Proyecto:
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={(e) => {
                const val = e.target.value;
                if (onlyLettersNumbersSpaces(val) || val === "")
                  setForm({ ...form, nombre: val });
              }}
            />
          </label>

          <label>
            Descripción:
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: sanitizeText(e.target.value) })
              }
            ></textarea>
          </label>

          <label>
            Dirección:
            <input
              type="text"
              name="direccion"
              value={form.direccion}
              onChange={(e) =>
                setForm({ ...form, direccion: sanitizeText(e.target.value) })
              }
            />
          </label>

          <label>
            Presupuesto Aproximado (Q):
            <input
              type="text"
              name="presupuesto_aprox"
              value={form.presupuesto_aprox}
              onChange={(e) => {
                const val = e.target.value;
                if (onlyPositiveNumbers(val) || val === "")
                  setForm({ ...form, presupuesto_aprox: val });
              }}
            />
          </label>

          <label>
            Saldo Abonado (Q):
            <input
              type="text"
              name="saldo_abonado"
              value={form.saldo_abonado}
              onChange={(e) => {
                const val = e.target.value;
                if (onlyPositiveNumbers(val) || val === "")
                  setForm({ ...form, saldo_abonado: val });
              }}
            />
          </label>

          <label>
            Estado:
            <select
              name="estado"
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
            >
              <option>En Curso</option>
              <option>Finalizado</option>
              <option>Pausado</option>
              <option>Cancelado</option>
            </select>
          </label>

          {/* Cliente */}
          <label>
            Cliente:
            <select
              name="cliente"
              value={form.cliente}
              onChange={(e) => setForm({ ...form, cliente: e.target.value })}
            >
              <option value="">-- Seleccione --</option>
              {usuarios.clientes.length > 0 ? (
                usuarios.clientes.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.nombres}
                  </option>
                ))
              ) : (
                <option disabled>No hay clientes disponibles</option>
              )}
            </select>
          </label>

          {/* Responsable */}
          <label>
            Responsable:
            <select
              name="responsable"
              value={form.responsable}
              onChange={(e) => setForm({ ...form, responsable: e.target.value })}
            >
              <option value="">-- Seleccione --</option>
              {usuarios.responsables.length > 0 ? (
                usuarios.responsables.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.nombres}
                  </option>
                ))
              ) : (
                <option disabled>No hay responsables disponibles</option>
              )}
            </select>
          </label>
        </div>

        {/* DOCUMENTOS */}
        <div className="documentos-section">
        <h3>Documentos Adjuntos</h3>

        <div className="documentos-container" >
            {documentos.length > 0 ? (
            <ul>
                {documentos.map((doc) => (
                <li key={doc.public_id} >
                    <a
                    href={doc.url_firmada || doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    >
                    {doc.nombre}
                    </a>
                    <a
                    href={(doc.url_firmada || doc.url) + "?download=true"}
                    title="Descargar"
                    className="download-link"
                    >
                    <Download size={16} />
                    </a>
                </li>
                ))}
            </ul>
            ) : (
            <p>
                No hay documentos adjuntos.
            </p>
            )}
        </div>

        <button
            type="button"
            onClick={handleUploadClick}
            className="btn-guardar"
            style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "4px",
            }}
        >
            <Upload size={18} /> Cargar
        </button>
        </div>


        <div className="form-actions-btn">
          <button type="submit" className="btn-guardar">
            Actualizar
          </button>
        </div>
      </form>

      <ModalMensaje {...modal} />
    </div>
  );
}
