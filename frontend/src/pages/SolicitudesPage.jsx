import React, { useEffect, useState, useContext } from "react";
import Sidebar from "../components/Sidebar";
import { Search, Check, X } from "lucide-react";
import "../styles/ProyectosPage.css"; // reutiliza el mismo CSS de ProyectosPage
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

  // Modal para rechazo con motivo
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
    } catch (e) {
      alert("No se pudo aprobar");
    }
  };

  // Abrir modal para capturar motivo del rechazo
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

            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="APROBADA">Aprobada</option>
              <option value="RECHAZADA">Rechazada</option>
              <option value="CONFLICTO">Conflicto</option>
              <option value="CANCELADA">Cancelada</option>
            </select>

            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="ABONO">Abono</option>
              <option value="CAMBIO_ESTADO">Cambio de estado</option>
            </select>
          </div>
        </div>

        <table className="p-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Proyecto</th>
              <th>Tipo</th>
              <th>Resumen</th>
              <th>Solicitante</th>
              <th>Aprobador</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "left", padding: "20px" }}>
                  Cargando...
                </td>
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

                // Permitir que el titular apruebe incluso si él mismo creó la solicitud (autoaprobación)
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
                    <td>{s.estado}</td>
                    <td className="table-actions">
                      {puedeAccionar ? (
                        <>
                          <button
                            className="btn btn-approve"
                            onClick={() => aprobar(s._id)}
                            title="Aprobar"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                          >
                            <Check size={18} style={{ color: "#16a34a" }} />
                          </button>
                          <button
                            className="btn btn-reject"
                            onClick={() => abrirModalRechazo(s._id)}
                            title="Rechazar"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                          >
                            <X size={18} style={{ color: "#dc2626" }} />
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
                <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
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
        <div style={{ display: "grid", gap: 8 }}>
          <label htmlFor="motivo-rechazo" style={{ fontWeight: 600 }}>Motivo (opcional)</label>
          <textarea
            id="motivo-rechazo"
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Escribe el motivo del rechazo..."
            style={{
              resize: "vertical",
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              outline: "none"
            }}
          />
        </div>
      </ModalMensaje>
    </div>
  );
}
