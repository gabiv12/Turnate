import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

/** Permite acceso si NO hay usuario o si rol === "cliente" */
export default function OnlyClienteOrAnon({ children }) {
  const { user } = useContext(UserContext);
  const rol = String(user?.rol || "").toLowerCase();
  if (user && rol !== "cliente") return <Navigate to="/emprendedor" replace />;
  return children;
}
