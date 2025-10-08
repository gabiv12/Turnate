// src/pages/Dashboard.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell, faCalendarDays, faChartLine, faRightFromBracket,
  faStore, faUserPen, faChevronLeft, faChevronRight
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";

import UpdateUserForm from "./UpdateUserForm";
import EmprendedorForm from "./EmprendedorForm";
import CardPlan from "./CardPlan";
import Estadisticas from "./Estadisticas";
import Turnos from "./Turnos";
import { UserContext } from "../context/UserContext";
import { logout as doLogout } from "../services/auth";

export default function Dashboard() {
  const { user, login } = useContext(UserContext);
  const [active, setActive] = useState("perfil"); // valor inicial fijo para evitar reorder
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  // Decide vista inicial al montar según rol
  useEffect(() => {
    setActive((prev) => {
      if (prev !== "perfil") return prev; // si ya cambió, respetarlo
      return user?.rol === "emprendedor" ? "turnos" : "perfil";
    });
  }, [user?.rol]);

  if (!user) return <div className="p-6">Cargando...</div>;

  const handleActivateEmprendedor = () => {
    // Solo cambia rol en el front para mostrar pantallas; persistilo si querés desde el backend.
    login({ ...user, rol: "emprendedor" });
    setActive("emprendedor");
  };

  const handleLogout = () => {
    doLogout();
    navigate("/login", { replace: true });
  };

  const itemCls = (key) =>
    `w-full text-left px-4 py-3 rounded-lg mb-2 transition
     ${active === key ? "bg-white/90 text-cyan-700 shadow" : "bg-white/20 hover:bg-white/30 text-white"}`;

  const displayName = useMemo(
    () => user?.nombre?.trim() || user?.email || "Usuario",
    [user]
  );

  return (
    <div className="bg-gray-100 min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 transition-all duration-200 ${sidebarOpen ? "w-64" : "w-16"}`}>
        <div className="h-full bg-gradient-to-b from-blue-600 to-cyan-400 shadow-xl pt-6">
          <div className="flex items-center justify-between px-4 mb-6">
            <div className={`text-white font-semibold ${sidebarOpen ? "text-lg" : "text-sm"}`}>
              {sidebarOpen ? "Panel Turnate" : "T"}
            </div>
            <button
              className="text-white/90 hover:text-white"
              onClick={() => setSidebarOpen((s) => !s)}
              title={sidebarOpen ? "Contraer" : "Expandir"}
            >
              <FontAwesomeIcon icon={sidebarOpen ? faChevronLeft : faChevronRight} />
            </button>
          </div>

          <div className="px-4 mb-4">
            <div className="bg-white/15 backdrop-blur rounded-lg p-3 text-white">
              <div className="text-sm opacity-80">Sesión</div>
              <div className="font-semibold truncate">{displayName}</div>
              <div className="text-xs opacity-80 mt-1">Rol: {user?.rol || "cliente"}</div>
            </div>
          </div>

          <nav className="px-4 pb-6">
            <button className={itemCls("perfil")} onClick={() => setActive("perfil")}>
              <FontAwesomeIcon icon={faUserPen} className="mr-2" />
              {sidebarOpen && "Editar Perfil"}
            </button>

            <button
              className={itemCls(user?.rol === "cliente" ? "cardplan" : "emprendedor")}
              onClick={() => setActive(user?.rol === "cliente" ? "cardplan" : "emprendedor")}
            >
              <FontAwesomeIcon icon={faStore} className="mr-2" />
              {sidebarOpen && "Emprendimiento"}
            </button>

            {user?.rol === "emprendedor" && (
              <button className={itemCls("turnos")} onClick={() => setActive("turnos")}>
                <FontAwesomeIcon icon={faCalendarDays} className="mr-2" />
                {sidebarOpen && "Turnos"}
              </button>
            )}

            <button className={itemCls("estadisticas")} onClick={() => setActive("estadisticas")}>
              <FontAwesomeIcon icon={faChartLine} className="mr-2" />
              {sidebarOpen && "Estadísticas"}
            </button>
          </nav>

          <div className="px-4">
            <button
              className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg transition shadow"
              onClick={handleLogout}
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="mr-2" />
              {sidebarOpen && "Cerrar sesión"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className={`${sidebarOpen ? "ml-64" : "ml-16"} flex-1 transition-all duration-200`}>
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="font-semibold text-gray-800">
              {active === "perfil" && "Editar Perfil"}
              {active === "emprendedor" && "Mi Emprendimiento"}
              {active === "cardplan" && "Activar Emprendimiento"}
              {active === "turnos" && "Gestión de Turnos"}
              {active === "estadisticas" && "Estadísticas"}
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600" title="Notificaciones">
                <FontAwesomeIcon icon={faBell} />
              </button>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-white grid place-items-center font-semibold">
                {displayName?.[0]?.toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4">
          {active === "perfil" && <UpdateUserForm />}
          {active === "estadisticas" && <Estadisticas />}
          {active === "cardplan" && user.rol === "cliente" && (
            <CardPlan user={user} onActivate={handleActivateEmprendedor} />
          )}
          {active === "emprendedor" && <EmprendedorForm />}
          {active === "turnos" && <Turnos />}
          {!active && <div className="text-gray-600">Seleccioná una opción del menú para comenzar.</div>}
        </main>
      </div>
    </div>
  );
}
