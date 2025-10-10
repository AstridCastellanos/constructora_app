import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./Login.css";
import logo from "./assets/FondoEdificios.png";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";


import {
  onlyLettersAndUnderscore,
  lettersNumbersAndSigns,
} from "./utils/inputValidators";

export default function Login() {

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  // Función genérica para manejar onChange
  const handleInput = (validator, setValue) => (e) => {
    const value = e.target.value;
    if (validator(value) || value === "") setValue(value);
  };

  // Función genérica para manejar onPaste
  const handlePaste = (validator, setValue) => (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    if (validator(pasted)) {
      setValue(pasted);
    }
  };

  // FUNCIÓN DE LOGIN

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje("");

    try {
      const respuesta = await fetch("http://localhost:4000/api/usuarios/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identificador: usuario,
          password: password,
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        setMensaje(data.mensaje || "Error al iniciar sesión");
      } else {
        setMensaje("Inicio de sesión exitoso");

        // 🔹 Guarda en el contexto y localStorage
        login(JSON.stringify(data.usuario), data.usuario.roles?.[0] || "empleado", data.token);

        // 🔹 Redirige al dashboard
        setTimeout(() => {
          navigate("/proyectos", { replace: true });
        }, 600);

      }
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error de conexión con el servidor");
    } finally {
      setCargando(false);
    }
  };


  // INTERFAZ DEL FORMULARIO

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-card">
          <img src={logo} alt="Logo" className="login-logo" />
          <h2>Constructora P.S</h2>

          <form onSubmit={handleSubmit}>
            {/* Usuario */}
            <div className="form-group">
              <input
                type="text"
                placeholder="Usuario"
                value={usuario}
                onChange={handleInput(onlyLettersAndUnderscore, setUsuario)}
                onPaste={handlePaste(onlyLettersAndUnderscore, setUsuario)}
              />
            </div>

            {/* Contraseña */}
            <div className="form-group password-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={handleInput(lettersNumbersAndSigns, setPassword)}
                onPaste={handlePaste(lettersNumbersAndSigns, setPassword)}
              />
              <span
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            <button type="submit" disabled={cargando}>
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {/* Mensaje de estado */}
          {mensaje && <p style={{ marginTop: "10px" }}>{mensaje}</p>}
        </div>
      </div>

      <div className="login-right"></div>
    </div>
  );
}
