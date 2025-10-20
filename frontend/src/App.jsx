import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import ProyectosPage from "./pages/ProyectosPage";
import ChatPage from "./pages/ChatPage";
import UsuariosPage from "./pages/UsuariosPage"; 
import ProtectedRoute from "./components/ProtectedRoute";
import "./styles/Chat.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Ruta protegida para proyectos */}
        <Route
          path="/proyectos"
          element={
            <ProtectedRoute allowedRoles={["administrador", "titular", "colaborador"]}>
              <ProyectosPage />
            </ProtectedRoute>
          }
        />

        {/* Ruta protegida para chat */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute allowedRoles={["administrador", "titular", "colaborador", "cliente"]}>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        {/* Nueva ruta protegida para configuración */}
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute allowedRoles={["administrador", "titular"]}>
              <UsuariosPage />
            </ProtectedRoute>
          }
        />

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
