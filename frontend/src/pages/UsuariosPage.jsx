import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import ModalMensaje from "../components/ModalMensaje";
import { Search, Eye, EyeOff } from "lucide-react";
import "../styles/UsuariosPage.css";
import {
  onlyLetters,
  onlyNumbers,
  onlyLettersAndUnderscore,
} from "../utils/inputValidators";

export default function UsuariosPage() {
  const [form, setForm] = useState({
    usuario_sistema: "",
    nombres: "",
    email: "",
    telefono: "",
    fecha_registro: "",
    password: "",
    estado: "activo",
    roles: [],
  });

  const [isSearching, setIsSearching] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Estado global del modal
  const [modal, setModal] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
    tipo: "info",
    onAceptar: null,
    onCancelar: null,
    mostrarCancelar: false,
  });

  const mostrarModal = (config) => setModal({ visible: true, ...config });
  const cerrarModal = () => setModal({ ...modal, visible: false });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // Validar formato del usuario del sistema
  const handleUsuarioChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/\s+/g, "_");
    if (onlyLettersAndUnderscore(val) || val === "")
      setForm({ ...form, usuario_sistema: val });
  };

  // Buscar usuario existente
const handleBuscar = async () => {
  if (!form.usuario_sistema.trim()) return;
  setIsSearching(true);

  try {
    const res = await fetch(
      `http://localhost:4000/api/usuarios/${form.usuario_sistema}`
    );
    const data = await res.json();

    if (res.ok && data) {
      // Si existe, llenar los campos sin mostrar ningún mensaje
      setForm({
        ...form,
        nombres: data.nombres,
        email: data.email,
        telefono: data.telefono || "",
        fecha_registro: data.fecha_registro?.split("T")[0] || "",
        estado: data.estado,
        roles: data.roles || [],
        password: "",
      });
    } else {
      // Si no se encuentra, mostrar aviso con modal
      mostrarModal({
        titulo: "Usuario no encontrado",
        mensaje: `No existe ningún registro con el nombre de usuario "${form.usuario_sistema}". Puedes crear uno nuevo si lo deseas.`,
        tipo: "info",
        onAceptar: cerrarModal,
      });

      // Limpiar el formulario excepto el nombre de usuario
      setForm({
        ...form,
        nombres: "",
        email: "",
        telefono: "",
        fecha_registro: "",
        password: "",
        estado: "activo",
        roles: [],
      });
    }
  } catch (err) {
    console.error("Error buscando usuario:", err);
    mostrarModal({
      titulo: "Error de conexión",
      mensaje: "No se pudo conectar con el servidor.",
      tipo: "error",
      onAceptar: cerrarModal,
    });
  } finally {
    setIsSearching(false);
  }
};

  // Guardar o actualizar usuario
  const handleGuardar = async () => {
    try {
      const checkRes = await fetch(
        `http://localhost:4000/api/usuarios/${form.usuario_sistema}`
      );
      const exists = checkRes.ok;

      // Validaciones locales
      const camposRequeridos = [
        "usuario_sistema",
        "nombres",
        "email",
        "telefono",
        "estado",
      ];
      for (const campo of camposRequeridos) {
        if (!form[campo] || form[campo].trim() === "") {
          mostrarModal({
            titulo: "Campo obligatorio",
            mensaje: `El campo "${campo}" es obligatorio.`,
            tipo: "warning",
            onAceptar: cerrarModal,
          });
          return;
        }
      }

      if (form.usuario_sistema.length < 3 || form.usuario_sistema.length > 50) {
        mostrarModal({
          titulo: "Validación de usuario",
          mensaje:
            "El usuario del sistema debe tener entre 3 y 50 caracteres.",
          tipo: "warning",
          onAceptar: cerrarModal,
        });
        return;
      }

      if (form.nombres.length > 80) {
        mostrarModal({
          titulo: "Validación de nombre",
          mensaje: "El nombre no puede tener más de 80 caracteres.",
          tipo: "warning",
          onAceptar: cerrarModal,
        });
        return;
      }

      if (form.email.length > 120) {
        mostrarModal({
          titulo: "Validación de correo",
          mensaje: "El correo no puede tener más de 120 caracteres.",
          tipo: "warning",
          onAceptar: cerrarModal,
        });
        return;
      }

      if (form.telefono.length < 8 || form.telefono.length > 20) {
        mostrarModal({
          titulo: "Validación de teléfono",
          mensaje: "El teléfono debe tener entre 8 y 20 dígitos.",
          tipo: "warning",
          onAceptar: cerrarModal,
        });
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        mostrarModal({
          titulo: "Correo inválido",
          mensaje: "Ingrese un correo electrónico válido.",
          tipo: "error",
          onAceptar: cerrarModal,
        });
        return;
      }

      if (!exists || form.password.trim() !== "") {
        const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*.,_\-]).{10,40}$/;
        if (!passRegex.test(form.password)) {
          mostrarModal({
            titulo: "Contraseña inválida",
            mensaje:
              "La contraseña debe tener entre 10 y 40 caracteres, al menos una mayúscula y un símbolo especial permitido.",
            tipo: "warning",
            onAceptar: cerrarModal,
          });
          return;
        }
      }

      // Confirmar acción antes de guardar
      mostrarModal({
        titulo: "Confirmar acción",
        mensaje: exists
          ? "¿Deseas actualizar este usuario?"
          : "¿Deseas crear este nuevo usuario?",
        tipo: "info",
        mostrarCancelar: true,
        onAceptar: async () => {
          cerrarModal();

          const method = exists ? "PUT" : "POST";
          const url = exists
            ? `http://localhost:4000/api/usuarios/${form.usuario_sistema}`
            : "http://localhost:4000/api/usuarios";

          const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });

          const data = await res.json();

          if (res.ok) {
            mostrarModal({
              titulo: "Operación exitosa",
              mensaje: data.mensaje || "Operación completada correctamente.",
              tipo: "success",
              onAceptar: () => {
                cerrarModal();
                handleLimpiar();
              },
            });
          } else {
            mostrarModal({
              titulo: "Error",
              mensaje: data.mensaje || "Ocurrió un problema al guardar.",
              tipo: "error",
              onAceptar: cerrarModal,
            });
          }
        },
        onCancelar: cerrarModal,
      });
    } catch (err) {
      console.error("Error guardando usuario:", err);
      mostrarModal({
        titulo: "Error de conexión",
        mensaje: "No se pudo conectar con el servidor.",
        tipo: "error",
        onAceptar: cerrarModal,
      });
    }
  };

  // Eliminar usuario
  const handleEliminar = async () => {
    if (!form.usuario_sistema) {
      mostrarModal({
        titulo: "Dato faltante",
        mensaje: "Debe ingresar el usuario a eliminar.",
        tipo: "warning",
        onAceptar: cerrarModal,
      });
      return;
    }

    mostrarModal({
      titulo: "Confirmar eliminación",
      mensaje: "¿Seguro que deseas eliminar este usuario?",
      tipo: "error",
      mostrarCancelar: true,
      onAceptar: async () => {
        cerrarModal();
        try {
          const res = await fetch(
            `http://localhost:4000/api/usuarios/${form.usuario_sistema}`,
            { method: "DELETE" }
          );
          const data = await res.json();
          if (res.ok) {
            mostrarModal({
              titulo: "Usuario eliminado",
              mensaje: data.mensaje || "El usuario fue eliminado correctamente.",
              tipo: "success",
              onAceptar: () => {
                cerrarModal();
                handleLimpiar();
              },
            });
          } else {
            mostrarModal({
              titulo: "Error",
              mensaje: data.mensaje || "No se pudo eliminar el usuario.",
              tipo: "error",
              onAceptar: cerrarModal,
            });
          }
        } catch (err) {
          console.error("Error eliminando usuario:", err);
          mostrarModal({
            titulo: "Error de conexión",
            mensaje: "No se pudo conectar con el servidor.",
            tipo: "error",
            onAceptar: cerrarModal,
          });
        }
      },
      onCancelar: cerrarModal,
    });
  };

  const handleLimpiar = () => {
    setForm({
      usuario_sistema: "",
      nombres: "",
      email: "",
      telefono: "",
      fecha_registro: "",
      password: "",
      estado: "activo",
      roles: [],
    });
    setMsg("");
  };

  return (
    <div className="layout">
      <Sidebar />

      <section className="usuarios-col">
        <div className="u-header">
          <h2>Usuarios</h2>
        </div>

        <div className="usuarios-form">
          <div className="col">
            <label className="u-label">Usuario:</label>
            <div className="search-input">
              <input
                name="usuario_sistema"
                value={form.usuario_sistema}
                onChange={handleUsuarioChange}
                placeholder="nombre_apellido"
                minLength={3}
                maxLength={50}
                required
              />
              <button
                disabled={!form.usuario_sistema.trim() || isSearching}
                onClick={handleBuscar}
                title="Buscar usuario"
              >
                <Search size={18} />
              </button>
            </div>

            <label className="u-label">Correo:</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="usuario@correo.com"
              maxLength={120}
              required
            />

            <label className="u-label">Fecha de Ingreso:</label>
            <input
              type="date"
              name="fecha_registro"
              value={form.fecha_registro}
              onChange={handleChange}
            />

            <label className="u-label">Roles:</label>
            <select
              name="roles"
              multiple
              value={form.roles}
              onChange={(e) => {
                const selected = Array.from(
                  e.target.selectedOptions,
                  (opt) => opt.value
                );
                if (selected.includes("cliente")) {
                  setForm({ ...form, roles: ["cliente"] });
                } else {
                  setForm({ ...form, roles: selected });
                }
              }}
            >
              <option value="administrador">Administrador</option>
              <option value="titular">Titular</option>
              <option value="colaborador">Colaborador</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>

          <div className="col">
            <label className="u-label">Nombre:</label>
            <input
              name="nombres"
              value={form.nombres}
              onChange={(e) => {
                if (onlyLetters(e.target.value) || e.target.value === "")
                  handleChange(e);
              }}
              placeholder="Nombre completo"
              maxLength={80}
              required
            />

            <label className="u-label">Teléfono:</label>
            <input
              name="telefono"
              value={form.telefono}
              onChange={(e) => {
                if (onlyNumbers(e.target.value) || e.target.value === "")
                  handleChange(e);
              }}
              placeholder="Ej. 555111222"
              minLength={8}
              maxLength={20}
              required
            />

            <label className="u-label">Contraseña:</label>
            <div className="search-input">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 10 caracteres"
                minLength={10}
                maxLength={40}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label className="u-label">Estado:</label>
            <select name="estado" value={form.estado} onChange={handleChange}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        {msg && <p className="msg">{msg}</p>}

        <div className="btn-group">
          <button className="btn-guardar" onClick={handleGuardar}>
            Guardar
          </button>
          <button className="btn-limpiar" onClick={handleLimpiar}>
            Limpiar
          </button>
          <button className="btn-eliminar" onClick={handleEliminar}>
            Eliminar
          </button>
        </div>
      </section>

      {/* Modal de mensajes global */}
      <ModalMensaje {...modal} />
    </div>
  );
}
