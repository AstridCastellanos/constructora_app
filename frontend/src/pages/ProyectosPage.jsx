import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { Search } from "lucide-react";
import "../styles/ProyectosPage.css";
import { lettersNumbersAndHyphen } from "../utils/inputValidators";

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:4000/api/proyectos", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProyectos(data))
      .catch((err) => console.error("Error al cargar proyectos:", err));
  }, []);

  // 🔍 Nueva función de filtrado
  const proyectosFiltrados = proyectos.filter((p) => {
    const term = filtro.trim().toLowerCase();
    if (!term) return true;

    // Datos base del proyecto
    const codigo = p.codigo_proyecto?.toLowerCase() || "";
    const cliente = p.participantes?.find(
      (x) => x.rol_en_proyecto === "cliente"
    )?.usuario_id?.nombres?.toLowerCase();
    const responsable = p.participantes?.find(
      (x) => x.rol_en_proyecto === "arquitecto"
    )?.usuario_id?.nombres?.toLowerCase();

    // Coincidencia en cualquiera de los campos
    return (
      codigo.includes(term) ||
      cliente?.includes(term) ||
      responsable?.includes(term)
    );
  });

  // Manejar búsqueda al presionar Enter
  const handleBuscar = () => {
    // No se necesita hacer nada porque el filtro ya se aplica en tiempo real
    // pero si quieres ejecutar algo extra, lo dejas aquí
    console.log("Buscando:", filtro);
  };

  return (
    <div className="layout">
      <Sidebar />

      <section className="proyectos-col">
        <div className="p-header">
          <h2>Proyectos</h2>

          <div className="p-search">
            <Search />
            <input
              placeholder="Buscar proyecto"
              value={filtro}
              onChange={(e) => {
                const value = e.target.value;
                // Validar solo letras, números y guiones
                if (value === "" || lettersNumbersAndHyphen(value)) {
                  setFiltro(value);
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            />
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
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {proyectosFiltrados.length > 0 ? (
              proyectosFiltrados.map((p, i) => {
                const cliente = p.participantes?.find(
                  (x) => x.rol_en_proyecto === "cliente"
                )?.usuario_id?.nombres;

                const responsable = p.participantes?.find(
                  (x) => x.rol_en_proyecto === "arquitecto"
                )?.usuario_id?.nombres;

                return (
                  <tr key={i}>
                    <td className="p-codigo">{p.codigo_proyecto}</td>
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
                          p.estado.toLowerCase() === "en curso"
                            ? "estado--enproceso"
                            : p.estado.toLowerCase() === "finalizado"
                            ? "estado--finalizado"
                            : p.estado.toLowerCase() === "pausado"
                            ? "estado--pausado"
                            : p.estado.toLowerCase() === "cancelado"
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
