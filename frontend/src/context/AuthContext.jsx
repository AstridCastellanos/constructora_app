import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [roles, setRoles] = useState([]); 
  const [token, setToken] = useState(null);

  // Cargar datos almacenados al iniciar la app
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario");
    const rolesGuardados = localStorage.getItem("rol"); 
    const tokenGuardado = localStorage.getItem("token");

    if (usuarioGuardado && tokenGuardado) {
      setUsuario(JSON.parse(usuarioGuardado));
      // Si era string, lo convierte a array
      try {
        const parsedRoles = JSON.parse(rolesGuardados);
        setRoles(Array.isArray(parsedRoles) ? parsedRoles : [parsedRoles]);
      } catch {
        setRoles(rolesGuardados ? [rolesGuardados] : []);
      }
      setToken(tokenGuardado);
    }
  }, []);

  // Iniciar sesión (guardar datos en contexto y localStorage)
  const login = (usuario, rolesUsuario, token) => {
    const usuarioObj =
      typeof usuario === "string" ? JSON.parse(usuario) : usuario;

    // Asegura que siempre sea un array
    const rolesArray = Array.isArray(rolesUsuario)
      ? rolesUsuario
      : [rolesUsuario];

    setUsuario(usuarioObj);
    setRoles(rolesArray);
    setToken(token);

    localStorage.setItem("usuario", JSON.stringify(usuarioObj));
    localStorage.setItem("rol", JSON.stringify(rolesArray)); 
    localStorage.setItem("token", token);
  };

  // Cerrar sesión (limpiar todo)
  const logout = () => {
    setUsuario(null);
    setRoles([]);
    setToken(null);
    localStorage.removeItem("usuario");
    localStorage.removeItem("rol");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ usuario, roles, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
