import React, { useEffect, useState, useContext } from "react";
import Sidebar from "../components/Sidebar";
import { Search, Check, X, Download } from "lucide-react";
import { exportToXlsx } from "../utils/excelExport";
import "../styles/ProyectosPage.css"; 
import "../styles/SolicitudesPage.css"; 
import { AuthContext } from "../context/AuthContext";
import ModalMensaje from "../components/ModalMensaje";

export default function SolicitudesPage() {
  const { usuario } = useContext(AuthContext);
  const roles = usuario?.roles || [];
  const esTitular = roles.includes("titular");

  const [solicitudes, setSolicitudes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [cargando, setCargando] = useState(true);

  // Modal rechazo
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const cargar = async () => {
    setCargando(true);
    const token = localStorage.getItem("token");
    const qs = new URLSearchParams();
    if (filtroEstado) qs.append("estado", filtroEstado);
    if (filtroTipo) qs.append("tipo", filtroTipo);

    try {
      const res = await fetch(`http://localhost:4000/api/solicitudes?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSolicitudes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error al cargar solicitudes:", e);
      setSolicitudes([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [filtroEstado, filtroTipo]);

  const aprobar = async (id) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:4000/api/solicitudes/${id}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comentario: "" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.mensaje || "No se pudo aprobar");
      }
      cargar();
    } catch {
      alert("No se pudo aprobar");
    }
  };

  const abrirModalRechazo = (id) => {
    setRejectId(id);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const confirmarRechazo = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:4000/api/solicitudes/${rejectId}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comentario: rejectReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.mensaje || "No se pudo rechazar");
      }
      setShowRejectModal(false);
      setRejectId(null);
      setRejectReason("");
      cargar();
    } catch {
      alert("No se pudo rechazar");
    }
  };

  const cancelar = async (id) => {
    const token = localStorage.getItem("token");
    if (!window.confirm("¿Cancelar esta solicitud?")) return;
    try {
      const res = await fetch(`http://localhost:4000/api/solicitudes/${id}/cancelar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) alert("No se pudo cancelar");
      cargar();
    } catch {
      alert("No se pudo cancelar");
    }
  };

  // Búsqueda simple por código, proyecto, solicitante o aprobador
  const solicitudesFiltradas = solicitudes.filter((s) => {
    const term = filtro.trim().toLowerCase();
    if (!term) return true;

    const codigo = s.codigo?.toLowerCase() || "";
    const proyecto =
      s.proyectoId?.nombre?.toLowerCase() ||
      s.proyectoId?.codigo?.toLowerCase() ||
      "";
    const solicitanteUsr = s.solicitanteId?.usuario_sistema?.toLowerCase?.() || "";
    const aprobadorUsr   = s.decididaPorId?.usuario_sistema?.toLowerCase?.() || "";

    return (
      codigo.includes(term) ||
      proyecto.includes(term) ||
      solicitanteUsr.includes(term) ||
      aprobadorUsr.includes(term)
    );
  });

  // Exportar a Excel usando solo las filas visibles (filtradas)
const handleExport = async () => {
  const rows = solicitudesFiltradas.map((s) => {
    const solicitante =
      s.solicitanteId?.usuario_sistema || s.solicitanteId?.email || "-";

    const esAuto =
      typeof s.comentarioDecision === "string" &&
      s.comentarioDecision.toUpperCase().includes("AUTOAPROBADO");

    const aprobador =
      s.decididaPorId?.usuario_sistema || (esAuto ? "AUTOAPROBADO" : "-");

    const proyectoNombre =
      s.proyectoId?.nombre || s.proyectoId?.codigo || "-";

    const resumen =
      s.tipo === "ABONO"
        ? `Abono Q${Number(s?.payload?.abono?.monto || 0).toLocaleString("es-GT")}`
        : `${s?.payload?.cambioEstado?.nuevoEstado || ""}`;

    return {
      "Código": s.codigo,
      "Proyecto": proyectoNombre,
      "Tipo": s.tipo,
      "Resumen": resumen,
      "Solicitante": solicitante,
      "Aprobador": aprobador,
      "Fecha": new Date(s.solicitadaEn).toLocaleString("es-GT"),
      "Estado": s.estado,
    };
  });

  await exportToXlsx(rows, {
    sheetName: "Solicitudes",
    filePrefix: "Solicitudes", 
    // headers: ["Código","Proyecto","Tipo","Resumen","Solicitante","Aprobador","Fecha","Estado"], // opcional
  });
};

  const EstadoBadge = ({ estado }) => {
    const e = String(estado || "").toUpperCase();
    const map = {
      PENDIENTE: "badge badge-pending",
      APROBADA: "badge badge-approved",
      RECHAZADA: "badge badge-rejected",
      CONFLICTO: "badge badge-conflict",
      CANCELADA: "badge badge-cancelled",
    };
    return <span className={map[e] || "badge"}>{estado || "-"}</span>;
  };

  return (
    <div className="layout">
      <Sidebar />

      <section className="proyectos-col">
        <div className="p-header">
          <h2>Solicitudes</h2>

          <div className="p-actions">
            <div className="p-search">
              <Search />
              <input
                placeholder="Buscar solicitud, proyecto o usuario"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && cargar()}
              />
            </div>
            <button
              className="btn btn-export"
              onClick={handleExport}
              title="Exportar a Excel"
            >
              <Download size={18} className="icon-export" />
              <span className="hide-sm">Exportar</span>
            </button>
          </div>
        </div>

        <table className="p-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Proyecto</th>

              {/* Encabezado TIPO con select icon-only (reutiliza .estado-select) */}
              <th>
                <div className="th-estado">
                  <span>Tipo</span>
                  <select
                    className="estado-select icon-only"
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    aria-label="Filtrar por tipo"
                    title="Filtrar por tipo"
                  >
                    <option value="">Todos</option>
                    <option value="ABONO">Abono</option>
                    <option value="CAMBIO_ESTADO">Cambio de estado</option>
                  </select>
                </div>
              </th>

              <th>Resumen</th>
              <th>Solicitante</th>
              <th>Aprobador</th>
              <th>Fecha</th>

              {/* Encabezado ESTADO con select icon-only */}
              <th>
                <div className="th-estado">
                  <span>Estado</span>
                  <select
                    className="estado-select icon-only"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    aria-label="Filtrar por estado"
                    title="Filtrar por estado"
                  >
                    <option value="">Todos</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="APROBADA">Aprobada</option>
                    <option value="RECHAZADA">Rechazada</option>
                    <option value="CONFLICTO">Conflicto</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
              </th>

              <th className="th-actions">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="9" className="loading-cell">Cargando...</td>
              </tr>
            ) : solicitudesFiltradas.length > 0 ? (
              solicitudesFiltradas.map((s) => {
                const solicitante =
                  s.solicitanteId?.usuario_sistema ||
                  s.solicitanteId?.email ||
                  "-";

                const esAuto =
                  typeof s.comentarioDecision === "string" &&
                  s.comentarioDecision.toUpperCase().includes("AUTOAPROBADO");

                const aprobador =
                  s.decididaPorId?.usuario_sistema ||
                  (esAuto ? "AUTOAPROBADO" : "-");

                const proyectoNombre =
                  s.proyectoId?.nombre ||
                  s.proyectoId?.codigo ||
                  "-";

                const resumen =
                  s.tipo === "ABONO"
                    ? `Abono Q${Number(s?.payload?.abono?.monto || 0).toLocaleString("es-GT")}`
                    : `${s?.payload?.cambioEstado?.nuevoEstado || ""}`;

                const puedeAccionar = esTitular && s.estado === "PENDIENTE";

                return (
                  <tr key={s._id}>
                    <td className="p-codigo">{s.codigo}</td>
                    <td>{proyectoNombre}</td>
                    <td>{s.tipo}</td>
                    <td>{resumen}</td>
                    <td>{solicitante}</td>
                    <td>{aprobador}</td>
                    <td>{new Date(s.solicitadaEn).toLocaleString()}</td>
                    <td><EstadoBadge estado={s.estado} /></td>
                    <td className="table-actions">
                      {puedeAccionar ? (
                        <>
                          <button
                            className="btn btn-approve"
                            onClick={() => aprobar(s._id)}
                            title="Aprobar"
                          >
                            <Check size={18} className="icon-approve" />
                          </button>
                          <button
                            className="btn btn-reject"
                            onClick={() => abrirModalRechazo(s._id)}
                            title="Rechazar"
                          >
                            <X size={18} className="icon-reject" />
                          </button>
                        </>
                      ) : s.estado === "PENDIENTE" &&
                        String(s.solicitanteId?._id) === String(usuario?._id) ? (
                        <button className="btn btn-cancel" onClick={() => cancelar(s._id)}>
                          Cancelar
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" className="empty-cell">
                  No hay solicitudes que coincidan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Modal para motivo del rechazo */}
      <ModalMensaje
        visible={showRejectModal}
        titulo="Rechazar solicitud"
        tipo="warning"
        onAceptar={confirmarRechazo}
        onCancelar={() => { setShowRejectModal(false); setRejectReason(""); setRejectId(null); }}
        textoAceptar="Rechazar"
        textoCancelar="Cancelar"
        mostrarCancelar
      >
        <div className="modal-reject">
          <label htmlFor="motivo-rechazo" className="modal-label">Motivo (opcional)</label>
          <textarea
            id="motivo-rechazo"
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Escribe el motivo del rechazo..."
            className="modal-textarea"
          />
        </div>
      </ModalMensaje>
    </div>
  );
}
