import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [token, setToken] = useState(null);

  // 🔹 Cargar datos almacenados al iniciar la app
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario");
    const rolGuardado = localStorage.getItem("rol");
    const tokenGuardado = localStorage.getItem("token");

    if (usuarioGuardado && tokenGuardado) {
      setUsuario(JSON.parse(usuarioGuardado)); // se guarda como objeto
      setRol(rolGuardado);
      setToken(tokenGuardado);
    }
  }, []);

  // 🔹 Iniciar sesión (guardar datos en contexto y localStorage)
  const login = (usuario, rol, token) => {
    const usuarioObj =
      typeof usuario === "string" ? JSON.parse(usuario) : usuario;

    setUsuario(usuarioObj);
    setRol(rol);
    setToken(token);

    localStorage.setItem("usuario", JSON.stringify(usuarioObj));
    localStorage.setItem("rol", rol);
    localStorage.setItem("token", token);
  };

  // 🔹 Cerrar sesión (limpiar todo)
  const logout = () => {
    setUsuario(null);
    setRol(null);
    setToken(null);
    localStorage.removeItem("usuario");
    localStorage.removeItem("rol");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ usuario, rol, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
