// src/components/ProyectoDetalles.jsx
import React, { useState, useEffect, useContext, useCallback } from "react";
import { MessageSquare, Upload, Download } from "lucide-react";
import ModalMensaje from "./ModalMensaje";
import "../styles/ProyectoForm.css";
import { sanitizeText, onlyPositiveNumbers } from "../utils/inputValidators";
import { AuthContext } from "../context/AuthContext";

export default function ProyectoDetalles({ proyecto, modo = "page", onBack, onOpenChat }) {
  const { usuario } = useContext(AuthContext);
  const roles = usuario?.roles || [];
  // Solo lectura si es cliente y NO es titular ni colaborador
  const isReadOnly = roles.includes("cliente") && !roles.some(r => r === "titular" || r === "colaborador");

  const [form, setForm] = useState({
    descripcion: "",
    estado: "En Curso",
    direccion: "",
    presupuesto_aprox: "",
    saldo_abonado: "",   // siempre solo lectura
    saldo_a_abonar: "",  // se envía al backend
    cliente: "",
    responsable: "",
  });

  const [usuarios, setUsuarios] = useState({ clientes: [], responsables: [] });
  const [documentos, setDocumentos] = useState([]);
  const [modal, setModal] = useState({
    visible: false, titulo: "", mensaje: "", tipo: "info", onAceptar: null, mostrarCancelar: false,
  });

  const mostrarModal = (config) => setModal({ visible: true, ...config });
  const cerrarModal = () => setModal((m) => ({ ...m, visible: false }));

  // Normalizador para que mensajes y documentos del proyecto tengan el mismo shape
  const normalizeDoc = (d) => {
    if (!d) return null;
    // Algunos vienen como subdocumentos Mongoose (con toObject); homogenizamos:
    const base = typeof d.toObject === "function" ? d.toObject() : d;

    return {
      public_id: base.public_id,
      nombre: base.nombre || base.original_filename || "archivo",
      url: base.url,
      url_firmada: base.url_firmada, // si tu backend la envía
      resource_type: base.resource_type, // opcional (image|video|raw)
      formato: base.formato,
      tamaño: base.tamaño,
      _origen: base._origen || undefined, // etiqueta opcional para debug
    };
  };

  // Cargar listas (clientes/responsables)
  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      fetch("http://localhost:4000/api/usuarios/clientes", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("http://localhost:4000/api/usuarios/responsables", { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([resC, resR]) => {
        const clientes = await resC.json();
        const responsables = await resR.json();
        setUsuarios({ clientes, responsables });
      })
      .catch((err) => console.error("Error al cargar usuarios:", err));
  }, []);

  // 🔹 Helper: carga adjuntos de mensajes + documentos del proyecto y deduplica
  const loadDocumentos = useCallback(async (proyectoId) => {
    if (!proyectoId) return;

    const token = localStorage.getItem("token");

    try {
      const [resMensajes, resDocsProyecto] = await Promise.all([
        fetch(`http://localhost:4000/api/mensajes/proyecto/${proyectoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:4000/api/proyectos/${proyectoId}/documentos`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const dataMensajes = resMensajes.ok ? await resMensajes.json() : [];
      const dataDocs = resDocsProyecto.ok ? await resDocsProyecto.json() : [];

      // 1) Adjuntos que vienen dentro de mensajes
      const adjuntosMensajes = dataMensajes
        .flatMap((m) => Array.isArray(m.archivos) ? m.archivos : [])
        .map((a) => ({ ...normalizeDoc(a), _origen: "mensaje" }))
        .filter(Boolean);

      // 2) Documentos del proyecto (ruta nueva)
      const docsProyecto = (Array.isArray(dataDocs) ? dataDocs : [])
        .map((a) => ({ ...normalizeDoc(a), _origen: "proyecto" }))
        .filter(Boolean);

      // 3) Unir y deduplicar por public_id (mantén primero el de mensajes por si trae url_firmada)
      const map = new Map();
      [...adjuntosMensajes, ...docsProyecto].forEach((doc) => {
        if (doc?.public_id && !map.has(doc.public_id)) {
          map.set(doc.public_id, doc);
        }
      });

      setDocumentos(Array.from(map.values()));
    } catch (err) {
      console.error("Error al cargar documentos:", err);
    }
  }, []);

  // Cargar datos del proyecto + documentos (mensajes + proyecto)
  useEffect(() => {
    if (!proyecto?._id) return;

    const clienteObj = proyecto.participantes?.find(p => p.tipo_participante === "cliente");
    const responsableObj = proyecto.participantes?.find(p => p.tipo_participante === "responsable");

    setForm((f) => ({
      ...f,
      descripcion: proyecto.descripcion || "",
      estado: proyecto.estado || "En Curso",
      direccion: proyecto.direccion || "",
      presupuesto_aprox: proyecto.presupuesto_aprox || "",
      saldo_abonado: proyecto.saldo_abonado || "",
      saldo_a_abonar: "",
      cliente: clienteObj?.usuario_id?._id || "",
      responsable: responsableObj?.usuario_id?._id || "",
    }));

    // 🔹 trae adjuntos de ambas fuentes
    loadDocumentos(proyecto._id);
  }, [proyecto, loadDocumentos]);

  // Guardar: ENVÍA saldo_a_abonar para que el backend lo sume de forma atómica
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    // Validaciones mínimas
    if (!form.direccion.trim()) {
      return mostrarModal({ titulo: "Campo obligatorio", mensaje: `El campo "Dirección" es obligatorio.`, tipo: "warning", onAceptar: cerrarModal });
    }
    if (!form.cliente || !form.responsable) {
      return mostrarModal({ titulo: "Campo obligatorio", mensaje: `Selecciona Cliente y Responsable.`, tipo: "warning", onAceptar: cerrarModal });
    }
    if (Number(form.presupuesto_aprox) <= 0) {
      return mostrarModal({ titulo: "Presupuesto inválido", mensaje: "El presupuesto debe ser mayor que cero.", tipo: "warning", onAceptar: cerrarModal });
    }
    if (form.saldo_a_abonar && Number(form.saldo_a_abonar) <= 0) {
      return mostrarModal({ titulo: "Saldo a abonar inválido", mensaje: "Debe ser un número positivo.", tipo: "warning", onAceptar: cerrarModal });
    }

    const token = localStorage.getItem("token");

    const body = {
      descripcion: form.descripcion.trim(),
      direccion: form.direccion.trim(),
      presupuesto_aprox: Number(form.presupuesto_aprox),
      estado: form.estado,
      participantes: [
        { usuario_id: form.cliente, tipo_participante: "cliente" },
        { usuario_id: form.responsable, tipo_participante: "responsable" },
      ],
      saldo_a_abonar: Number(form.saldo_a_abonar) || 0,
    };

    try {
      const res = await fetch(`http://localhost:4000/api/proyectos/${proyecto._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        setForm((s) => ({
          ...s,
          saldo_a_abonar: "",
          saldo_abonado: data?.saldo_abonado != null ? String(data.saldo_abonado) : s.saldo_abonado,
        }));

        mostrarModal({
          titulo: "Proyecto actualizado",
          mensaje: "Los datos se enviaron correctamente.",
          tipo: "success",
          onAceptar: cerrarModal,
        });
      } else {
        mostrarModal({
          titulo: "Error",
          mensaje: data?.mensaje || "No se pudo actualizar el proyecto.",
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

  // Subir documento (oculto en solo lectura)
  const handleUploadClick = () => {
    if (isReadOnly) return;
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("archivo", file);
        // Ya NO es necesario id_proyecto en el body; va en la URL:
        // formData.append("id_proyecto", proyecto._id);

        try {
        const res = await fetch(`http://localhost:4000/api/proyectos/${proyecto._id}/documentos`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
        const data = await res.json();

        if (res.ok) {
            await loadDocumentos(proyecto._id); // recarga mensajes + docs del proyecto
            mostrarModal({
            titulo: "Archivo cargado",
            mensaje: "El documento se adjuntó correctamente.",
            tipo: "success",
            onAceptar: cerrarModal,
            });
        } else {
            mostrarModal({
            titulo: "Error",
            mensaje: data?.mensaje || "No se pudo subir el archivo.",
            tipo: "error",
            onAceptar: cerrarModal,
            });
        }
        } catch (err) {
        console.error("Error subiendo archivo:", err);
        mostrarModal({
            titulo: "Error",
            mensaje: "No se pudo subir el archivo.",
            tipo: "error",
            onAceptar: cerrarModal,
        });
        }
    };
    input.click();
  };

  return (
    <div className={`proyecto-detalles ${modo === "page" ? "modo-page" : "modo-chat"}`}>
      {/* ENCABEZADO: usa el título del caso */}
      <header className="p-header detalles-header">
        {modo === "chat" ? (
          <>
            <h2 className="detalles-title">{proyecto?.nombre}</h2>
            <button className="icon-btn icon-chat" onClick={() => onBack && onBack(proyecto)} title="Regresar al chat del proyecto">
              <MessageSquare />
            </button>
          </>
        ) : (
          <>
            <h2 className="detalles-title">{proyecto?.nombre}</h2>
            <button className="icon-btn icon-chat" onClick={() => onOpenChat && onOpenChat(proyecto)} title="Abrir chat del proyecto">
              <MessageSquare />
            </button>
          </>
        )}
      </header>

      {/* FORMULARIO: orden nuevo */}
      <form className="form-proyecto" onSubmit={handleUpdate}>
        <div className="form-grid">
          {/* 1) Descripción */}
          <label>
            Descripción:
            <textarea
              name="descripcion"
              value={form.descripcion}
              disabled={isReadOnly}
              onChange={(e) => setForm({ ...form, descripcion: sanitizeText(e.target.value) })}
            ></textarea>
          </label>

          {/* 2) Estado */}
          <label>
            Estado:
            <select
              name="estado"
              value={form.estado}
              disabled={isReadOnly}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              title={isReadOnly ? "Solo lectura para clientes" : undefined}
            >
              <option>En Curso</option>
              <option>Finalizado</option>
              <option>Pausado</option>
              <option>Cancelado</option>
            </select>
          </label>

          {/* 3) Dirección */}
          <label>
            Dirección:
            <input
              type="text"
              name="direccion"
              value={form.direccion}
              disabled={isReadOnly}
              onChange={(e) => setForm({ ...form, direccion: sanitizeText(e.target.value) })}
            />
          </label>

          {/* 4) Presupuesto Aproximado */}
          <label>
            Presupuesto Aproximado (Q):
            <input
              type="text"
              name="presupuesto_aprox"
              value={form.presupuesto_aprox}
              disabled={isReadOnly}
              onChange={(e) => {
                const val = e.target.value;
                if (onlyPositiveNumbers(val) || val === "") setForm({ ...form, presupuesto_aprox: val });
              }}
            />
          </label>

          {/* 5) Saldo Abonado (SIEMPRE SOLO LECTURA) */}
          <label>
            Saldo Abonado (Q):
            <input
              type="text"
              name="saldo_abonado"
              value={form.saldo_abonado}
              disabled
              readOnly
            />
          </label>

          {/* 6) Saldo a abonar (NUEVO) */}
          <label>
            Saldo a abonar (Q):
            <input
              type="text"
              name="saldo_a_abonar"
              value={form.saldo_a_abonar}
              disabled={isReadOnly}
              onChange={(e) => {
                const val = e.target.value;
                if (onlyPositiveNumbers(val) || val === "") setForm({ ...form, saldo_a_abonar: val });
              }}
              placeholder="Ej. 500"
            />
          </label>

          {/* 7) Cliente */}
          <label>
            Cliente:
            <select
              name="cliente"
              value={form.cliente}
              disabled={isReadOnly}
              onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              title={isReadOnly ? "Solo lectura para clientes" : undefined}
            >
              <option value="">-- Seleccione --</option>
              {usuarios.clientes.length > 0 ? (
                usuarios.clientes.map((u) => (
                  <option key={u._id} value={u._id}>{u.nombres}</option>
                ))
              ) : (
                <option disabled>No hay clientes disponibles</option>
              )}
            </select>
          </label>

          {/* 8) Responsable */}
          <label>
            Responsable:
            <select
              name="responsable"
              value={form.responsable}
              disabled={isReadOnly}
              onChange={(e) => setForm({ ...form, responsable: e.target.value })}
              title={isReadOnly ? "Solo lectura para clientes" : undefined}
            >
              <option value="">-- Seleccione --</option>
              {usuarios.responsables.length > 0 ? (
                usuarios.responsables.map((u) => (
                  <option key={u._id} value={u._id}>{u.nombres}</option>
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
          <div className="documentos-container">
            {documentos.length > 0 ? (
              <ul>
                {documentos.map((doc) => (
                  <li key={doc.public_id}>
                    <a href={doc.url_firmada || doc.url} target="_blank" rel="noopener noreferrer">
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
              <p>No hay documentos adjuntos.</p>
            )}
          </div>

          {/* Botón Cargar: oculto si solo lectura */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleUploadClick}
              className="btn-guardar"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "4px" }}
            >
              <Upload size={18} /> Cargar
            </button>
          )}
        </div>

        <div className="form-actions-btn">
          {/* Botón Actualizar: oculto si solo lectura */}
          {!isReadOnly && (
            <button type="submit" className="btn-guardar">
              Actualizar
            </button>
          )}
        </div>
      </form>

      <ModalMensaje {...modal} />
    </div>
  );
}
