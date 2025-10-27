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

  // Form local
  const [form, setForm] = useState({
    descripcion: "",
    estado: "En Curso",
    direccion: "",
    presupuesto_aprox: "",
    saldo_abonado: "",
    saldo_a_abonar: "",
    cliente: "",
    responsable: "",
  });

  // Estado persistido en BD (clave para bloquear inmediatamente tras guardar)
  const [estadoPersistido, setEstadoPersistido] = useState(proyecto?.estado || "En Curso");

  // Se considera cerrado si está Finalizado o Cancelado
  const isCerrado = ["Finalizado", "Cancelado"].includes(estadoPersistido);

  // Bloqueo por solicitud pendiente de cambio de estado
  const [bloqueoCambioEstado, setBloqueoCambioEstado] = useState(false);

  const isLocked = isReadOnly || isCerrado || bloqueoCambioEstado;

  const [usuarios, setUsuarios] = useState({ clientes: [], responsables: [] });
  const [documentos, setDocumentos] = useState([]);
  const [modal, setModal] = useState({
    visible: false, titulo: "", mensaje: "", tipo: "info", onAceptar: null, mostrarCancelar: false,
  });

  const mostrarModal = (config) => setModal({ visible: true, ...config });
  const cerrarModal = () => setModal((m) => ({ ...m, visible: false }));

  // Normalizador de shape
  const normalizeDoc = (d) => {
    if (!d) return null;
    const base = typeof d.toObject === "function" ? d.toObject() : d;
    return {
      public_id: base.public_id,
      nombre: base.nombre || base.original_filename || "archivo",
      url: base.url,
      url_firmada: base.url_firmada,
      resource_type: base.resource_type,
      formato: base.formato,
      tamaño: base.tamaño,
      _origen: base._origen || undefined,
    };
  };

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

  // ==== helpers para links centralizados ====
  const rtForDoc = (doc) => {
    if (doc?.resource_type) return doc.resource_type; // "image" | "video" | "raw"
    const f = String(doc?.formato || "").toLowerCase();
    if (["jpg","jpeg","png","gif","webp","svg"].includes(f)) return "image";
    if (["mp4","mov","webm","avi","mkv"].includes(f)) return "video";
    return "raw";
  };

  const buildArchivoUrl = (doc, download = false) => {
    const rt = rtForDoc(doc);
    const base = `http://localhost:4000/api/mensajes/archivo/${encodeURIComponent(doc.public_id)}`;
    return `${base}?rt=${rt}${download ? "&download=true" : ""}`;
  };
  // ===========================================

  // Crea solicitud de ABONO
  const crearSolicitudAbono = async (proyectoId, monto) => {
    const token = localStorage.getItem("token");
    await fetch("http://localhost:4000/api/solicitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        proyectoId,
        tipo: "ABONO",
        payload: { abono: { monto } }
      }),
    });
  };

  // Crea solicitud de CAMBIO DE ESTADO
  const crearSolicitudCambioEstado = async (proyectoId, nuevoEstado) => {
    const token = localStorage.getItem("token");
    await fetch("http://localhost:4000/api/solicitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        proyectoId,
        tipo: "CAMBIO_ESTADO",
        payload: { cambioEstado: { nuevoEstado, motivo: "Solicitado en edición de proyecto" } }
      }),
    });
  };

  // Consulta si hay bloqueo por solicitud pendiente de cambio a Finalizado/Cancelado
  const cargarBloqueo = useCallback(async () => {
    if (!proyecto?._id) return false;
    const token = localStorage.getItem("token");
    try {
      const r = await fetch(`http://localhost:4000/api/solicitudes/bloqueo/${proyecto._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await r.json();
      const bloqueado = !!j.bloqueado;
      setBloqueoCambioEstado(bloqueado);
      return bloqueado;
    } catch (e) {
      console.error("Error consultando bloqueo:", e);
      setBloqueoCambioEstado(false);
      return false;
    }
  }, [proyecto?._id]);

  // Cargar documentos (adjuntos del chat + docs del proyecto)
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

      const adjuntosMensajes = dataMensajes
        .flatMap((m) => Array.isArray(m.archivos) ? m.archivos : [])
        .map((a) => ({ ...normalizeDoc(a), _origen: "mensaje" }))
        .filter(Boolean);

      const docsProyecto = (Array.isArray(dataDocs) ? dataDocs : [])
        .map((a) => ({ ...normalizeDoc(a), _origen: "proyecto" }))
        .filter(Boolean);

      const map = new Map();
      [...adjuntosMensajes, ...docsProyecto].forEach((doc) => {
        if (doc?.public_id && !map.has(doc.public_id)) map.set(doc.public_id, doc);
      });

      setDocumentos(Array.from(map.values()));
    } catch (err) {
      console.error("Error al cargar documentos:", err);
    }
  }, []);

  // Cargar datos del proyecto + documentos + bloqueo
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

    setEstadoPersistido(proyecto.estado || "En Curso"); // <- sincroniza bloqueo
    loadDocumentos(proyecto._id);
    cargarBloqueo();
  }, [proyecto, loadDocumentos, cargarBloqueo]);

  // Guardar proyecto + generar solicitudes si aplica
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (isLocked) return;

    // Revalidar que no haya aparecido un bloqueo justo antes de enviar
    const bloqueadoAhora = await cargarBloqueo();
    if (bloqueadoAhora) {
      return mostrarModal({
        titulo: "Edición bloqueada",
        mensaje: "Hay una solicitud de cambio de estado pendiente. Espera su resolución.",
        tipo: "warning",
        onAceptar: cerrarModal
      });
    }

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

    const montoAbono = Number(form.saldo_a_abonar) || 0;
    const quiereCambioEstado =
      ["Finalizado", "Cancelado"].includes(form.estado) && form.estado !== estadoPersistido;

    // En el PUT no aplicamos ni el abono ni el cambio de estado final/cancelado.
    // Si el usuario pide Finalizado/Cancelado, mandamos el estado actual persistido para no cambiarlo aún.
    const body = {
      descripcion: form.descripcion.trim(),
      direccion: form.direccion.trim(),
      presupuesto_aprox: Number(form.presupuesto_aprox),
      estado: quiereCambioEstado ? estadoPersistido : form.estado,
      participantes: [
        { usuario_id: form.cliente, tipo_participante: "cliente" },
        { usuario_id: form.responsable, tipo_participante: "responsable" },
      ],
      // No enviar saldo_a_abonar al PUT; se gestionará vía solicitud de abono
    };

    try {
      const res = await fetch(`http://localhost:4000/api/proyectos/${proyecto._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        return mostrarModal({ titulo: "Error", mensaje: data?.mensaje || "No se pudo actualizar el proyecto.", tipo: "error", onAceptar: cerrarModal });
      }

      // Generar solicitudes que correspondan
      const solicitudes = [];
      if (montoAbono > 0) {
        try {
          await crearSolicitudAbono(proyecto._id, montoAbono);
          solicitudes.push("Solicitud de abono creada");
        } catch (e1) {
          console.error("Error creando solicitud de abono:", e1);
        }
      }
      if (quiereCambioEstado) {
        try {
          await crearSolicitudCambioEstado(proyecto._id, form.estado);
          solicitudes.push("Solicitud de cambio de estado creada");
        } catch (e2) {
          console.error("Error creando solicitud de cambio de estado:", e2);
        }
      }

      // Limpiar campo de abono y mantener estadoPersistido tal cual respondió el backend
      setForm((s) => ({
        ...s,
        saldo_a_abonar: "",
        saldo_abonado: data?.saldo_abonado != null ? String(data.saldo_abonado) : s.saldo_abonado,
        estado: data?.estado || s.estado, // mantiene el persistido si hubo solicitud de cambio
      }));
      setEstadoPersistido(data?.estado || estadoPersistido);

      const extra = solicitudes.length ? ` ${solicitudes.join(". ")}.` : "";
      mostrarModal({
        titulo: "Proyecto actualizado",
        mensaje: `Los datos se enviaron correctamente.${extra}`,
        tipo: "success",
        onAceptar: cerrarModal
      });
    } catch (error) {
      console.error("Error al actualizar proyecto:", error);
      mostrarModal({ titulo: "Error de conexión", mensaje: "No se pudo conectar con el servidor.", tipo: "error", onAceptar: cerrarModal });
    }
  };

  // Subir documento
  const handleUploadClick = () => {
    if (isLocked) return;
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("archivo", file);

      try {
        const res = await fetch(`http://localhost:4000/api/proyectos/${proyecto._id}/documentos`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();

        if (res.ok) {
          await loadDocumentos(proyecto._id);
          mostrarModal({ titulo: "Archivo cargado", mensaje: "El documento se adjuntó correctamente.", tipo: "success", onAceptar: cerrarModal });
        } else {
          mostrarModal({ titulo: "Error", mensaje: data?.mensaje || "No se pudo subir el archivo.", tipo: "error", onAceptar: cerrarModal });
        }
      } catch (err) {
        console.error("Error subiendo archivo:", err);
        mostrarModal({ titulo: "Error", mensaje: "No se pudo subir el archivo.", tipo: "error", onAceptar: cerrarModal });
      }
    };
    input.click();
  };

  return (
    <div className={`proyecto-detalles ${modo === "page" ? "modo-page" : "modo-chat"}`}>
      {/* Encabezado */}
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

      {/* Aviso de bloqueo por estado Finalizado / Cancelado */}
      {isCerrado && (
        <div className="alert-locked">
          Este proyecto está {estadoPersistido.toLowerCase()}. La edición de campos y carga de documentos está bloqueada.
        </div>
      )}

      {/* Aviso de bloqueo por solicitud pendiente de cambio de estado */}
      {bloqueoCambioEstado && !isCerrado && (
        <div className="alert-locked">
          Este proyecto tiene una solicitud de cambio de estado pendiente. La edición está bloqueada hasta su resolución.
        </div>
      )}

      {/* Formulario */}
      <form className="form-proyecto" onSubmit={handleUpdate}>
        <div className="form-grid">
          <label>
            Descripción:
            <textarea
              name="descripcion"
              value={form.descripcion}
              disabled={isLocked}
              onChange={(e) => setForm({ ...form, descripcion: sanitizeText(e.target.value) })}
            ></textarea>
          </label>

          <label>
            Estado:
            <select
              name="estado"
              value={form.estado}
              disabled={isLocked}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              title={isLocked ? "Solo lectura" : undefined}
            >
              <option>En Curso</option>
              <option>Finalizado</option>
              <option>Pausado</option>
              <option>Cancelado</option>
            </select>
          </label>

          <label>
            Dirección:
            <input
              type="text"
              name="direccion"
              value={form.direccion}
              disabled={isLocked}
              onChange={(e) => setForm({ ...form, direccion: sanitizeText(e.target.value) })}
            />
          </label>

          <label>
            Presupuesto Aproximado (Q):
            <input
              type="text"
              name="presupuesto_aprox"
              value={form.presupuesto_aprox}
              disabled={isLocked}
              onChange={(e) => {
                const val = e.target.value;
                if (onlyPositiveNumbers(val) || val === "") setForm({ ...form, presupuesto_aprox: val });
              }}
            />
          </label>

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

          <label>
            Saldo a abonar (Q):
            <input
              type="text"
              name="saldo_a_abonar"
              value={form.saldo_a_abonar}
              disabled={isLocked}
              onChange={(e) => {
                const val = e.target.value;
                if (onlyPositiveNumbers(val) || val === "") setForm({ ...form, saldo_a_abonar: val });
              }}
              placeholder="Ej. 500"
            />
          </label>

          <label>
            Cliente:
            <select
              name="cliente"
              value={form.cliente}
              disabled={isLocked}
              onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              title={isLocked ? "Solo lectura" : undefined}
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

          <label>
            Responsable:
            <select
              name="responsable"
              value={form.responsable}
              disabled={isLocked}
              onChange={(e) => setForm({ ...form, responsable: e.target.value })}
              title={isLocked ? "Solo lectura" : undefined}
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

        <div className="documentos-section">
          <h3>Documentos Adjuntos</h3>
          <div className="documentos-container">
            {documentos.length > 0 ? (
              <ul>
                {documentos.map((doc) => (
                  <li key={doc.public_id}>
                    <a href={buildArchivoUrl(doc, false)} target="_blank" rel="noopener noreferrer">
                      {doc.nombre}
                    </a>
                    <a
                      href={buildArchivoUrl(doc, true)}
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

          {!isLocked && (
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
          {!isLocked && (
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
