// src/components/Footer.jsx
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function Footer() {
  const { token } = useUser(); // usamos token para condicionar navegación

  return (
    <footer className="mt-12 bg-slate-950/95 text-slate-300">
      {/* franja superior sutil */}
      <div className="h-[2px] w-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 opacity-70" />

      <div className="px-4 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-6xl py-10 grid grid-cols-1 sm:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-semibold text-lg">Turnate</h3>
            <p className="mt-2 text-sm text-slate-400">
              Plataforma para gestionar turnos de forma simple y accesible.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold">Navegación</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li><Link to="/" className="hover:text-white">Inicio</Link></li>
              <li><Link to="/nosotros" className="hover:text-white">Nosotros</Link></li>
              {/* acceso para clientes: van a ingresar código */}
              <li><Link to="/codigo" className="hover:text-white">Reservar</Link></li>

              {/* Panel y Turnos SOLO si hay sesión */}
              {token && (
                <>
                  <li><Link to="/perfil" className="hover:text-white">Panel</Link></li>
                  <li><Link to="/turnos" className="hover:text-white">Turnos</Link></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold">Legal</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li><Link to="/terminos" className="hover:text-white">Términos y Condiciones</Link></li>
              <li><Link to="/privacidad" className="hover:text-white">Política de Privacidad</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold">Contacto</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="text-slate-400">Email: contactoturnate@gmail.com</li>
              <li className="text-slate-400">WhatsApp: +54 3644 12345678</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/70 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Turnate. Todos los derechos reservados.
      </div>
    </footer>
  );
}
