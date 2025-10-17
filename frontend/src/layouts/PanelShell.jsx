import { useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useUser } from "../context/UserContext.jsx"; // 👈 IMPORT UNIFICADO
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

const ItemLink = ({ to, children }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      [
        "block w-full text-left rounded-xl px-4 py-3 text-sm font-semibold transition shadow-sm",
        isActive ? "bg-white text-sky-700" : "bg-white/10 text-white hover:bg-white/20",
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
  const rol = String(user?.rol || "").toLowerCase();
  const showReservarBtn = !rol || rol === "cliente";

  const Content = children ?? <Outlet />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-cyan-400">
      <Header />

      <div className="pt-24 pb-16">
        <div className="w-full px-4 lg:pl-6 lg:pr-0">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
            <aside className="lg:sticky lg:top-[88px] self-start">
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

            <section className="min-h-[60vh] min-w-0 bg-white/0">
              {showReservarBtn && (
                <div className="flex justify-end mb-3">
                  <Link
                    to="/reservar"
                    className="rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 text-white font-semibold px-4 py-2 shadow ring-1 ring-blue-300/40 hover:scale-[1.01] transition"
                  >
                    Reservar
                  </Link>
                </div>
              )}
              {Content}
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
