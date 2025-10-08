import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useUser();
  const location = useLocation();

  // Esperá a que el contexto termine de inicializar (evita redirecciones temblorosas)
  if (loading) return null;

  // Si NO hay user y por error se envolvió /login o /registro, NO redirijas (evita loop)
  if (
    !user &&
    (location.pathname === "/login" || location.pathname === "/registro")
  ) {
    return children ?? <Outlet />;
  }

  // Si NO hay user: mandá a /login una sola vez
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Autenticado: render normal
  return children ?? <Outlet />;
}
