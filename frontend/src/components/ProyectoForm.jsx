import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ModalMensaje from "../components/ModalMensaje";
import "../styles/ProyectoForm.css";
import { useNavigate } from "react-router-dom";
import {
  onlyLettersNumbersSpaces,
  sanitizeText,
  onlyPositiveNumbers,
} from "../utils/inputValidators";

export default function ProyectoForm() {
  const navigate = useNavigate();

  // Estructura separada para clientes y responsables
  const [usuarios, setUsuarios] = useState({
    clientes: [],
    responsables: [],
  });

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

  // Modal global
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

  // Cargar clientes y responsables desde el backend
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

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // Validaciones antes de enviar
  const validarFormulario = () => {
    // Diccionario de nombres amigables para los campos
    const etiquetas = {
      nombre: "Nombre del Proyecto",
      direccion: "Dirección",
      presupuesto_aprox: "Presupuesto Aproximado",
      cliente: "Cliente",
      responsable: "Responsable",
    };

    // Campos que deben completarse
    const camposRequeridos = Object.keys(etiquetas);

    for (const campo of camposRequeridos) {
      if (!form[campo] || form[campo].toString().trim() === "") {
        mostrarModal({
          titulo: "Campo obligatorio",
          mensaje: `El campo "${etiquetas[campo]}" es obligatorio.`,
          tipo: "warning",
          onAceptar: cerrarModal,
        });
        return false;
      }
    }

    if (Number(form.presupuesto_aprox) <= 0) {
      mostrarModal({
        titulo: "Presupuesto inválido",
        mensaje: "El presupuesto aproximado debe ser mayor que cero.",
        tipo: "warning",
        onAceptar: cerrarModal,
      });
      return false;
    }

    return true;
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) return;

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
      const res = await fetch("http://localhost:4000/api/proyectos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        mostrarModal({
          titulo: "Proyecto creado",
          mensaje: "El proyecto fue creado correctamente.",
          tipo: "success",
          onAceptar: () => {
            cerrarModal();
            navigate("/proyectos");
          },
        });
      } else {
        mostrarModal({
          titulo: "Error",
          mensaje: data.mensaje || "No se pudo crear el proyecto.",
          tipo: "error",
          onAceptar: cerrarModal,
        });
      }
    } catch (error) {
      console.error("Error al crear proyecto:", error);
      mostrarModal({
        titulo: "Error de conexión",
        mensaje: "No se pudo conectar con el servidor.",
        tipo: "error",
        onAceptar: cerrarModal,
      });
    }
  };

  return (
    <div className="layout">
      <Sidebar />

      <section className="proyectos-col">
        <div className="pf-header">
          <h2>Nuevo Proyecto</h2>
        </div>

        <form className="form-proyecto" onSubmit={handleSubmit}>
          <div className="form-grid">

            {/* NOMBRE */}
            <label>
              Nombre del Proyecto:
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={(e) => {
                  const val = e.target.value;
                  if (onlyLettersNumbersSpaces(val) || val === "") {
                    setForm({ ...form, nombre: val });
                  }
                }}
                placeholder="Ej. Residencial Las Brisas"
                maxLength={100}
              />
            </label>

            {/* DESCRIPCIÓN */}
            <label>
              Descripción:
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={(e) => {
                  const limpio = sanitizeText(e.target.value);
                  setForm({ ...form, descripcion: limpio });
                }}
                placeholder="Detalles opcionales del proyecto"
                maxLength={500}
              ></textarea>
            </label>

            {/* DIRECCIÓN */}
            <label>
              Dirección:
              <input
                type="text"
                name="direccion"
                value={form.direccion}
                onChange={(e) => {
                  const limpio = sanitizeText(e.target.value);
                  setForm({ ...form, direccion: limpio });
                }}
                placeholder="Ej. 4ta avenida zona 1, Chiquimulilla"
                maxLength={150}
              />
            </label>

            {/* PRESUPUESTO */}
            <label>
              Presupuesto Aproximado (Q):
              <input
                type="text"
                name="presupuesto_aprox"
                value={form.presupuesto_aprox}
                onChange={(e) => {
                  const val = e.target.value;
                  if (onlyPositiveNumbers(val) || val === "") {
                    setForm({ ...form, presupuesto_aprox: val });
                  }
                }}
                placeholder="Ej. 150000"
              />
            </label>

            {/* SALDO ABONADO */}
            <label>
              Saldo Abonado (Q):
              <input
                type="text"
                name="saldo_abonado"
                value={form.saldo_abonado}
                onChange={(e) => {
                  const val = e.target.value;
                  if (onlyPositiveNumbers(val) || val === "") {
                    setForm({ ...form, saldo_abonado: val });
                  }
                }}
                placeholder="Ej. 50000"
              />
            </label>

            {/* ESTADO */}
            <label>
              Estado:
              <select name="estado" value={form.estado} onChange={handleChange}>
                <option>En Curso</option>
                <option>Finalizado</option>
                <option>Pausado</option>
                <option>Cancelado</option>
              </select>
            </label>

            {/* CLIENTE */}
            <label>
              Cliente:
              <select
                name="cliente"
                value={form.cliente}
                onChange={handleChange}
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

            {/* RESPONSABLE */}
            <label>
              Responsable:
              <select
                name="responsable"
                value={form.responsable}
                onChange={handleChange}
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

          <div className="form-actions">
            <button type="submit" className="btn-guardar">
              Guardar
            </button>
            <button
              type="button"
              className="btn-cancelar"
              onClick={() => navigate("/proyectos")}
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>

      {/* Modal global para mensajes */}
      <ModalMensaje {...modal} />
    </div>
  );
}
