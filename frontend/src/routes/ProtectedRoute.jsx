import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext.jsx";

export default function ProtectedRoute() {
  const { user, setUser } = useUser() || {};
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Rehidratación suave desde localStorage si el contexto viene vacío
    if (!user) {
      try {
        const raw = localStorage.getItem("user");
        const token = localStorage.getItem("accessToken");
        if (raw && token) {
          const u = JSON.parse(raw);
          if (u?.id) setUser?.(u);
        }
      } catch {}
    }
    setReady(true);
  }, [user, setUser]);

  if (!ready) return null; // pequeño suspense

  if (!user || !user.id) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
