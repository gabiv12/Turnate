// src/layouts/PanelShell.jsx
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

const ItemLink = ({ to, children }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      [
        "block w-full text-left rounded-xl px-4 py-3 text-sm font-semibold transition shadow-sm",
        isActive
          ? "bg-white text-sky-700"
          : "bg-white/10 text-white hover:bg-white/20",
      ].join(" ")
    }
  >
    {children}
  </NavLink>
);

export default function PanelShell({ children }) {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Si se usa como layout con rutas anidadas:
  const Content = children ?? <Outlet />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-cyan-400">
      {/* HEADER fijo arriba */}
      <Header />

      {/* Contenido del panel (dejamos espacio top para el header fijo) */}
      <div className="pt-24 pb-16">
        {/* CONTENEDOR IZQUIERDO
            - En mobile: padding horizontal
            - En lg+: pegado a la IZQUIERDA (pl-6) y SIN centrar (nada de mx-auto)
            - El contenido usa grilla con sidebar fijo a la izquierda y área de trabajo expandida */}
        <div className="w-full px-4 lg:pl-6 lg:pr-0">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
            {/* Sidebar (tarjeta azul), pegado a la izquierda */}
            <aside className="lg:sticky lg:top-[88px] self-start">
              {/* Toggle en mobile */}
              <div className="lg:hidden mb-3">
                <button
                  onClick={() => setOpen((s) => !s)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  {open ? "Ocultar panel" : "Mostrar panel"}
                </button>
              </div>

              <div
                className={[
                  "rounded-3xl p-[10px] shadow-lg overflow-hidden",
                  "bg-gradient-to-b from-blue-700 to-cyan-500",
                  open ? "block" : "hidden lg:block",
                ].join(" ")}
              >
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="mb-3">
                    <div className="text-white/90 text-sm font-semibold">Panel</div>
                    <div className="text-white/80 text-xs">Herramientas rápidas</div>
                  </div>

                  <div className="space-y-3">
                    <ItemLink to="/perfil">Editar Perfil</ItemLink>
                    <ItemLink to="/emprendimiento">Emprendimiento</ItemLink>
                    <ItemLink to="/turnos">Turnos</ItemLink>
                    <ItemLink to="/estadisticas">Estadísticas</ItemLink>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => {
                        logout();
                        navigate("/login", { replace: true });
                      }}
                      className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-red-500 shadow hover:brightness-110"
                    >
                      Cerrar sesión
                    </button>
                  </div>

                  <div className="mt-3 text-[11px] text-white/80">
                    Sesión: {user?.username || user?.email || "—"}
                  </div>
                </div>
              </div>
            </aside>

            {/* Área de contenido: ocupa TODO el resto (más espacio para calendario) */}
            <section className="min-h-[60vh] min-w-0 bg-white/0">
              {Content}
            </section>
          </div>
        </div>
      </div>

      {/* FOOTER (no fijo): aparece siempre, el contenido no lo pisa */}
      <Footer />
    </div>
  );
}
