// src/components/CardPlan.jsx
import React, { useContext } from "react";
import { UserContext } from "../context/UserContext";
import api from "../components/api";

export default function CardPlan() {
  const { user, setUser } = useContext(UserContext);

  // Si el usuario ya es emprendedor, no mostrar la tarjeta
  if (user?.rol === "emprendedor") return null;

  const handleActivate = async () => {
    try {
      // Simulás el pago y activás el rol
      const res = await api.put(`/usuarios/${user?.id}/activar_emprendedor`);
      const { user: userServer, token } = res.data || {};

      if (token) localStorage.setItem("accessToken", token);

      const updatedUser = userServer || { ...user, rol: "emprendedor" };
      localStorage.setItem("rol", updatedUser.rol);

      setUser((prev) => ({ ...prev, ...updatedUser }));
      alert("¡Listo! Tu cuenta ahora es de emprendedor.");
    } catch (error) {
      const msg =
        error?.response?.data?.detail ||
        "No se pudo activar el rol. Revisá la consola para más info.";
      console.error("Error activando rol de emprendedor:", error);
      alert(msg);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mt-6">
      {/* Fondo con degradé azul → verde metalizado */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-400 shadow-2xl">
        {/* Brillo metálico sutil */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        {/* Contenido en “glass” */}
        <div className="relative p-6 md:p-8">
          {/* Etiqueta superior */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
            Plan Emprendedor
          </div>

          {/* Título y precio */}
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight">
                Acceso por mes
              </h3>
              <p className="text-white/90 text-sm md:text-base">
                Tu agenda digital de turnos, sin límites.
              </p>
            </div>

            <div className="text-right">
              <div className="text-white text-4xl md:text-5xl font-extrabold leading-none drop-shadow-sm">
                $14.000
              </div>
              <div className="text-white/80 text-xs font-medium">ARS · pago único</div>
            </div>
          </div>

          {/* Separador */}
          <div className="my-6 h-px w-full bg-white/20" />

          {/* Beneficios */}
          <ul className="grid gap-3 text-white/95">
            {[
              "Publicá tus servicios y horarios",
              "Gestión simple de turnos y reservas",
              "Notificaciones y control de capacidad",
              "Soporte prioritario por email",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/25">
                  {/* check icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <span className="text-sm md:text-base font-medium">{item}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="mt-8">
            <button
              onClick={handleActivate}
              className="
                group relative inline-flex w-full items-center justify-center gap-2
                rounded-xl bg-gradient-to-r from-blue-500 to-emerald-400
                px-5 py-3 font-semibold text-white shadow-lg ring-1 ring-white/20
                transition-transform hover:scale-[1.02] hover:shadow-xl
                focus:outline-none focus:ring-2 focus:ring-white/40
              "
            >
              <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
              Activar ahora
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>

            {/* Garantía/nota */}
            <p className="mt-3 text-center text-xs text-white/80">
              Sin suscripciones. Actualizaciones incluidas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
