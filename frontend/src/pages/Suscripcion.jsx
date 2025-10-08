// src/pages/Suscripcion.jsx
import { Navigate } from "react-router-dom";

/**
 * Página desactivada: redirige al panel de emprendedor.
 * Dejamos la ruta viva por si existen links viejos.
 */
export default function Suscripcion() {
  return <Navigate to="/emprendedor" replace />;
}
