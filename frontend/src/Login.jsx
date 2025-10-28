import { useState, useContext } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import logo from "./assets/FondoEdificios.png";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import Toast from "./components/Toast";
import {
  onlyLettersAndUnderscore,
  lettersNumbersAndSigns,
} from "./utils/inputValidators";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState(null);
  const [cargando, setCargando] = useState(false);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const res = await fetch("http://localhost:4000/api/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador: usuario, password }),
      });

      const data = await res.json();

      // Validación por código de estado
      if (!res.ok) {
        if (res.status === 403) {
          showToast("Tu cuenta está inactiva. Contacta al administrador.", "warning");
        } else if (res.status === 401) {
          showToast("Contraseña incorrecta.", "error");
        } else if (res.status === 404) {
          showToast("Usuario no encontrado.", "error");
        } else if (res.status === 400) {
          showToast("Debe ingresar usuario y contraseña.", "warning");
        } else {
          showToast(data.mensaje || "Error al iniciar sesión.", "error");
        }
        return; // Detiene la ejecución si hubo error
      }

      // Si la respuesta es correcta (200)
      const rolesUsuario = data.usuario.roles || [];
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);

      // Guardar sesión
      login(data.usuario, rolesUsuario, data.token);

      // Redirigir según rol y dispositivo
      if (rolesUsuario.includes("cliente")) {
        if (isMobile) {
          navigate("/chat", { replace: true });
        } else {
          showToast("Los clientes solo pueden ingresar desde dispositivos móviles.", "warning");
        }
      } else {
        navigate(isMobile ? "/chat" : "/proyectos", { replace: true });
      }

    } catch (error) {
      console.error("Error en login:", error);
      showToast("Error de conexión con el servidor.", "error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-card">
          <img src={logo} alt="Logo" className="login-logo" />
          <h2>Constructora P.S</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Usuario"
                value={usuario}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || onlyLettersAndUnderscore(value)) {
                    setUsuario(value);
                  }
                }}
              />
            </div>

            <div className="form-group password-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || lettersNumbersAndSigns(value)) {
                    setPassword(value);
                  }
                }}
                minLength={10}
                maxLength={40} // ← 🔹 límite directo
              />
              <span
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            <button type="submit" disabled={cargando} className="login-bt">
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>

      <div className="login-right"></div>

      {/* Toast visible si hay mensaje */}
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
