// src/routes/ProtectedEmprendedorRoute.jsx
import React, { useContext, useEffect, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import api, { readToken, setToken } from "../components/api";

export default function ProtectedEmprendedorRoute() {
  const { user } = useContext(UserContext) || {};
  const location = useLocation();
  const [status, setStatus] = useState(
    user?.rol === "emprendedor" ? "allow" : "pending"
  );

  useEffect(() => {
    if (status !== "pending") return;

    const t = readToken();
    if (!t) {
      setStatus("deny");
      return;
    }
    setToken(t);

    // Si no es rol emprendedor, verificamos en el backend si tiene registro
    api
      .get("/emprendedores/mi")
      .then((r) => {
        const hasEmp = r?.data && (r.data.id || r.data.usuario_id);
        setStatus(hasEmp ? "allow" : "deny");
      })
      .catch(() => setStatus("deny"));
  }, [status]);

  if (status === "pending") return null; // o un loader si preferís

  return status === "allow" ? (
    <Outlet />
  ) : (
    <Navigate to="/perfil" replace state={{ from: location, needEmp: true }} />
  );
}
