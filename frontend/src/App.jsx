import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import ProyectosPage from "./pages/ProyectosPage";
import ChatPage from "./pages/ChatPage";
import UsuariosPage from "./pages/UsuariosPage";
import ProyectoForm from "./components/ProyectoForm"; 
import ProtectedRoute from "./components/ProtectedRoute";
import ProyectoDetallesPage from "./pages/ProyectoDetallesPage";
import "./styles/Chat.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Listado de proyectos */}
        <Route
          path="/proyectos"
          element={
            <ProtectedRoute allowedRoles={["administrador", "titular", "colaborador"]}>
              <ProyectosPage />
            </ProtectedRoute>
          }
        />

        {/* Formulario para crear nuevo proyecto */}
        <Route
          path="/proyectos/nuevo"
          element={
            <ProtectedRoute allowedRoles={["administrador", "titular", "colaborador"]}>
              <ProyectoForm />
            </ProtectedRoute>
          }
        />

        {/* Chat */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute allowedRoles={["administrador", "titular", "colaborador", "cliente"]}>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        {/* Gestión de usuarios */}
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute allowedRoles={["administrador", "titular"]}>
              <UsuariosPage />
            </ProtectedRoute>
          }
        />

        {/* Detalles de un proyecto */}
        <Route
          path="/proyectos/:id"
          element={
            <ProtectedRoute allowedRoles={["administrador", "titular", "colaborador"]}>
              <ProyectoDetallesPage />
            </ProtectedRoute>
          }
        />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
