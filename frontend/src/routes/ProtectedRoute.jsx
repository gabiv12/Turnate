import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext.jsx";

export default function ProtectedRoute() {
  const { user, setUser } = useUser() || {};
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // Rehidratar siempre que falte contexto
      const token = localStorage.getItem("accessToken");
      const raw = localStorage.getItem("user");
      if ((!user || !user.id) && token && raw) {
        const u = JSON.parse(raw);
        if (u?.id) setUser?.(u);
      }
    } catch {}
    setReady(true);
  }, [user, setUser]);

  if (!ready) return null;

  const hasToken = !!localStorage.getItem("accessToken");
  const hasUser = !!(user?.id || JSON.parse(localStorage.getItem("user") || "{}")?.id);

  if (!hasToken || !hasUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
