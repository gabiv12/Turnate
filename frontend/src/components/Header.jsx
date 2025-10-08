import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const LOGO_SRC = "/images/TurnateLogo.png";

const linkBase =
  "px-5 py-2.5 rounded-full text-base font-medium transition-colors duration-150";

const navClass = ({ isActive }) =>
  isActive
    ? `${linkBase} bg-white text-blue-700 shadow`
    : `${linkBase} text-white/90 hover:text-white bg-white/0 hover:bg-white/10`;

const navBtnClass = ({ isActive }) =>
  isActive
    ? `${linkBase} bg-white text-blue-700 shadow`
    : `${linkBase} border border-white/70 text-white/95 hover:bg-white/10`;

export default function Header() {
  // ⬇️ traemos token además de user
  const { user, token, logout } = useUser();
  const [openMobile, setOpenMobile] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const dropdownBtnRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onDoc = (e) => {
      if (
        openDropdown &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        dropdownBtnRef.current &&
        !dropdownBtnRef.current.contains(e.target)
      ) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openDropdown]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpenDropdown(false);
        setOpenMobile(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = () => {
    logout();
    setOpenDropdown(false);
    setOpenMobile(false);
    navigate("/login");
  };

  const initial =
    (user?.username?.[0] || user?.email?.[0] || user?.nombre?.[0] || "U").toUpperCase();

  return (
    <header className="bg-gradient-to-r from-blue-600 to-cyan-400 shadow-lg fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10 py-4 md:py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={LOGO_SRC} alt="Turnate" className="h-11 w-auto select-none" draggable="false" />
          <span className="font-extrabold text-2xl text-white tracking-tight">Turnate</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-3">
          <NavLink to="/" end className={navClass}>Inicio</NavLink>
          <NavLink to="/nosotros" end className={navClass}>Nosotros</NavLink>

          {/* Turnos SOLO si hay token */}
          {token && (
            <NavLink to="/turnos" end className={navClass}>Turnos</NavLink>
          )}

          {/* Usuario */}
          {token ? (
            <div className="relative ml-2">
              <button
                ref={dropdownBtnRef}
                onClick={() => setOpenDropdown((s) => !s)}
                className="rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                aria-haspopup="menu"
                aria-expanded={openDropdown}
              >
                <div className="w-10 h-10 grid place-items-center rounded-full text-white font-semibold border border-white/50 bg-white/10 backdrop-blur-sm">
                  {initial}
                </div>
              </button>

              {openDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 mt-3 w-64 rounded-xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden"
                  role="menu"
                >
                  <div className="px-4 py-3 border-b bg-slate-50">
                    <p className="text-sm text-slate-500">Sesión iniciada</p>
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {user?.username || user?.email}
                    </p>
                  </div>
                  <ul className="py-1">
                    <li>
                      <NavLink
                        to="/emprendedor"  // 👈 si tu ruta real es /emprendimiento, cambialo aquí
                        end
                        className="block px-4 py-2.5 text-sm hover:bg-slate-100"
                        onClick={() => setOpenDropdown(false)}
                      >
                        Panel de control
                      </NavLink>
                    </li>
                    <li>
                      <button
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100"
                        onClick={handleLogout}
                      >
                        Cerrar sesión
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink to="/login" end className={navClass}>Login</NavLink>
              <NavLink to="/registro" end className={navBtnClass}>Registrarse</NavLink>
            </>
          )}
        </nav>

        {/* Mobile button */}
        <div className="md:hidden">
          <button
            onClick={() => setOpenMobile((s) => !s)}
            className="rounded-md p-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            aria-label="Abrir menú"
            aria-expanded={openMobile}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden origin-top ${openMobile ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0 pointer-events-none"} bg-white shadow-lg transition-transform duration-200`}
      >
        <ul className="flex flex-col gap-1 p-4 text-slate-700">
          <li><NavLink to="/" end onClick={() => setOpenMobile(false)} className="block px-3 py-2 rounded-md hover:bg-slate-100">Inicio</NavLink></li>
          <li><NavLink to="/nosotros" end onClick={() => setOpenMobile(false)} className="block px-3 py-2 rounded-md hover:bg-slate-100">Nosotros</NavLink></li>

          {/* Turnos SOLO con token */}
          {token && (
            <li><NavLink to="/turnos" end onClick={() => setOpenMobile(false)} className="block px-3 py-2 rounded-md hover:bg-slate-100">Turnos</NavLink></li>
          )}

          {!token ? (
            <>
              <li className="mt-2">
                <NavLink to="/login" end onClick={() => setOpenMobile(false)} className="block px-3 py-2 rounded-md bg-blue-600 text-white text-center">
                  Login
                </NavLink>
              </li>
              <li>
                <NavLink to="/registro" end onClick={() => setOpenMobile(false)} className="block px-3 py-2 rounded-md border border-blue-600 text-blue-700 text-center">
                  Registrarse
                </NavLink>
              </li>
            </>
          ) : (
            <>
              <li className="mt-2 border-t pt-2">
                <NavLink
                  to="/perfil"  // 👈 alinear al path real
                  end
                  onClick={() => setOpenMobile(false)}
                  className="block px-3 py-2 rounded-md hover:bg-slate-100"
                >
                  Panel de control
                </NavLink>
              </li>
              <li>
                <button onClick={() => { handleLogout(); setOpenMobile(false); }} className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100">
                  Cerrar sesión
                </button>
              </li>
            </>
          )}

          <li className="mt-2 border-t pt-2"><NavLink to="/terminos" end onClick={() => setOpenMobile(false)} className="block px-3 py-2 rounded-md hover:bg-slate-100">Términos</NavLink></li>
          <li><NavLink to="/privacidad" end onClick={() => setOpenMobile(false)} className="block px-3 py-2 rounded-md hover:bg-slate-100">Privacidad</NavLink></li>
        </ul>
      </div>
    </header>
  );
}
