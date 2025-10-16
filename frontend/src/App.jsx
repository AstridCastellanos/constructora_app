import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import ProyectosPage from "./pages/ProyectosPage";
import ChatPage from "./pages/ChatPage"; // 👈 agrega esto
import ProtectedRoute from "./components/ProtectedRoute";
import "./styles/Chat.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* ✅ Ruta protegida para proyectos */}
        <Route
          path="/proyectos"
          element={
            <ProtectedRoute allowedRoles={["admin", "titular", "colaborador"]}>
              <ProyectosPage />
            </ProtectedRoute>
          }
        />

        {/* ✅ Ruta protegida para chat */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute allowedRoles={["admin", "titular", "colaborador", "cliente"]}>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        {/* Si intentan acceder a una ruta no existente */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
