// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import PublicShell from "./layouts/PublicShell.jsx";
import PanelShell from "./layouts/PanelShell.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

// Páginas públicas
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import IngresarCodigo from "./pages/IngresarCodigo.jsx";
import Reservar from "./pages/Reservar.jsx";
import Nosotros from "./pages/Nosotros.jsx";
import Terminos from "./pages/Terminos.jsx";
import Privacidad from "./pages/Privacidad.jsx";

// Páginas de panel
import Perfil from "./pages/Perfil.jsx";
import Emprendimiento from "./pages/Emprendimiento.jsx";
import Turnos from "./pages/Turnos.jsx";
import Estadisticas from "./pages/Estadisticas.jsx";
import Servicios from "./pages/Servicios.jsx";
import Horarios from "./pages/Horarios.jsx";

export default function App() {
  return (
    <Routes>
      {/* PÚBLICAS con Header+Footer */}
      <Route element={<PublicShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/codigo" element={<IngresarCodigo />} />
        <Route path="/reservar/:code" element={<Reservar />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/terminos" element={<Terminos />} />
        <Route path="/privacidad" element={<Privacidad />} />
      </Route>

      {/* PANEL protegido (usa TU PanelShell) */}
      <Route element={<ProtectedRoute><PanelShell /></ProtectedRoute>}>
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/emprendimiento" element={<Emprendimiento />} />
        <Route path="/turnos" element={<Turnos />} />
        <Route path="/estadisticas" element={<Estadisticas />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/horarios" element={<Horarios />} />
        {/* alias que redirigen al perfil */}
        <Route path="/panel" element={<Navigate to="/perfil" replace />} />
        <Route path="/emprendedor" element={<Navigate to="/perfil" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
