import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

/** Deja entrar solo a rol "emprendedor" */
export default function RequireEmprendedor({ children }) {
  const { user } = useContext(UserContext);
  const rol = String(user?.rol || "").toLowerCase();
  if (rol !== "emprendedor") return <Navigate to="/" replace />;
  return children;
}
