import React, { useEffect, useState, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import { Search, Plus, Download } from "lucide-react"; 
import { exportToXlsx } from "../utils/excelExport";
import "../styles/ProyectosPage.css";
import { lettersNumbersAndHyphen } from "../utils/inputValidators";
import { useNavigate } from "react-router-dom";

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:4000/api/proyectos", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProyectos(data))
      .catch((err) => console.error("Error al cargar proyectos:", err));
  }, []);

  const estadosUnicos = useMemo(() => {
    const set = new Set((proyectos || []).map(p => p?.estado).filter(Boolean));
    const orden = ["En Curso", "Finalizado", "Pausado", "Cancelado"];
    const ordenados = orden.filter(x => set.has(x));
    const otros = [...set].filter(x => !orden.includes(x));
    return [...ordenados, ...otros];
  }, [proyectos]);

  const proyectosFiltrados = useMemo(() => {
    const term = filtro.trim().toLowerCase();
    return (proyectos || []).filter((p) => {
      const codigo = p.codigo_proyecto?.toLowerCase() || "";
      const cliente = p.participantes?.find((x) => x.tipo_participante === "cliente")?.usuario_id?.nombres?.toLowerCase() || "";
      const responsable = p.participantes?.find((x) => x.tipo_participante === "responsable")?.usuario_id?.nombres?.toLowerCase() || "";
      const coincideTexto = !term || codigo.includes(term) || cliente.includes(term) || responsable.includes(term);
      const coincideEstado = !estadoFiltro || p.estado === estadoFiltro;
      return coincideTexto && coincideEstado;
    });
  }, [proyectos, filtro, estadoFiltro]);

  const handleBuscar = () => {
    console.log("Buscando:", filtro);
  };

  // Exportar a Excel (usa util compartido)
const handleExport = async () => {
  const rows = proyectosFiltrados.map((p) => {
    const cliente = p.participantes?.find(
      (x) => x.tipo_participante === "cliente"
    )?.usuario_id?.nombres || "-";

    const responsable = p.participantes?.find(
      (x) => x.tipo_participante === "responsable"
    )?.usuario_id?.nombres || "-";

    const fecha = new Date(p.fecha_inicio).toLocaleDateString("es-GT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return {
      "No. Proyecto": p.codigo_proyecto,
      "Proyecto": p.nombre,
      "Cliente": cliente,
      "Responsable": responsable,
      "Fecha Inicio": fecha,
      "Estado": p.estado,
    };
  });

  await exportToXlsx(rows, {
    sheetName: "Proyectos",
    filePrefix: "Proyectos",
    // headers: ["No. Proyecto","Proyecto","Cliente","Responsable","Fecha Inicio","Estado"], 
  });
};


  return (
    <div className="layout">
      <Sidebar />

      <section className="proyectos-col">
        <div className="p-header">
          <h2>Proyectos</h2>

          <div className="p-actions">
            <div className="p-search">
              <Search />
              <input
                placeholder="Buscar proyecto"
                value={filtro}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || lettersNumbersAndHyphen(value)) {
                    setFiltro(value);
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              />
            </div>

            <button
              className="btn-nuevo"
              onClick={() => navigate("/proyectos/nuevo")}
            >
              <Plus size={18} />
              <span>Nuevo</span>
            </button>

            {/* ← NUEVO: botón Exportar a la par de “Nuevo” */}
            <button
              className="btn-export"
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
              <th>No. Proyecto</th>
              <th>Proyecto</th>
              <th>Cliente</th>
              <th>Responsable</th>
              <th>Fecha Inicio</th>
              <th>
                <div className="th-estado">
                  <span>Estado</span>
                  <select
                    className="estado-select icon-only"
                    value={estadoFiltro}
                    onChange={(e) => setEstadoFiltro(e.target.value)}
                    aria-label="Filtrar por estado"
                    title="Filtrar por estado"
                  >
                    <option value="">Todos</option>
                    {estadosUnicos.map((est) => (
                      <option key={est} value={est}>{est}</option>
                    ))}
                  </select>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {proyectosFiltrados.length > 0 ? (
              proyectosFiltrados.map((p, i) => {
                const cliente = p.participantes?.find(
                  (x) => x.tipo_participante === "cliente"
                )?.usuario_id?.nombres;

                const responsable = p.participantes?.find(
                  (x) => x.tipo_participante === "responsable"
                )?.usuario_id?.nombres;

                return (
                  <tr key={i}>
                    <td
                      className="p-codigo link"
                      onClick={() => navigate(`/proyectos/${p._id}`)}
                    >
                      {p.codigo_proyecto}
                    </td>
                    <td>{p.nombre}</td>
                    <td>{cliente || "-"}</td>
                    <td>{responsable || "-"}</td>
                    <td>
                      {new Date(p.fecha_inicio).toLocaleDateString("es-GT", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </td>
                    <td>
                      <span
                        className={`estado ${
                          p.estado?.toLowerCase() === "en curso"
                            ? "estado--enproceso"
                            : p.estado?.toLowerCase() === "finalizado"
                            ? "estado--finalizado"
                            : p.estado?.toLowerCase() === "pausado"
                            ? "estado--pausado"
                            : p.estado?.toLowerCase() === "cancelado"
                            ? "estado--cancelado"
                            : ""
                        }`}
                      >
                        {p.estado}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                  No hay proyectos que coincidan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
