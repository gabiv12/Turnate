import React, { useEffect, useState } from "react";
import { useUser } from "../context/UserContext.jsx";

export default function RequireAdmin({ children }) {
  const { user, setUser } = useUser() || {};
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          if (u?.id) setUser?.(u);
        }
      } catch {}
    }
    setReady(true);
  }, [user, setUser]);

  if (!ready) return null;

  const isAdmin = user && (Number(user.id) === 1 || String(user.rol || "").toLowerCase() === "admin");

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Reportes</h1>
        <p className="text-slate-600">No tenés permisos para ver esta página.</p>
      </div>
    );
  }

  return children;
}
