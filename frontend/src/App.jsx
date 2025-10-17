import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import PublicShell from "./layouts/PublicShell.jsx";
import PanelShell from "./layouts/PanelShell.jsx";

// Rutas protegidas
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import ProtectedEmprendedorRoute from "./routes/ProtectedEmprendedorRoute.jsx";

// Páginas públicas/estáticas
import Home from "./pages/home.jsx";
import Nosotros from "./pages/Nosotros.jsx";
import Privacidad from "./pages/Privacidad.jsx";
import Terminos from "./pages/Terminos.jsx";
import NotFound from "./pages/NotFound.jsx";

// Páginas públicas NO estáticas
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import IngresarCodigo from "./pages/IngresarCodigo.jsx";
import Reservar from "./pages/Reservar.jsx";

// Páginas autenticadas (cliente o emprendedor)
import Perfil from "./pages/Perfil.jsx";
import UpdateUserForm from "./pages/UpdateUserForm.jsx";
import Turnos from "./pages/Turnos.jsx";
import Estadisticas from "./pages/Estadisticas.jsx";
import Suscripcion from "./pages/Suscripcion.jsx";

// Solo emprendedor (configuración)
import Emprendimiento from "./pages/Emprendimiento.jsx";
import Servicios from "./pages/Servicios.jsx";
import Horarios from "./pages/Horarios.jsx";

export default function App() {
  return (
    <Routes>
      {/* ======== SIN PanelShell: Home + estáticas + Login/Registro ======== */}
      <Route element={<PublicShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/terminos" element={<Terminos />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* ======== CON PanelShell (layout) ======== */}
      <Route element={<PanelShell />}>
        {/* Públicas NO estáticas, con layout */}
        <Route path="/reservar" element={<IngresarCodigo />} />
        <Route path="/reservar/:codigo" element={<Reservar />} />

        {/* Autenticadas (cliente o emprendedor) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/update-user" element={<UpdateUserForm />} />
          <Route path="/turnos" element={<Turnos />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/suscripcion" element={<Suscripcion />} />
        </Route>

        {/* Solo emprendedor (configuración) */}
        <Route element={<ProtectedEmprendedorRoute />}>
          <Route path="/emprendimiento" element={<Emprendimiento />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/horarios" element={<Horarios />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Fallback final */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
