// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { login as apiLogin } from "../services/auth"; // ✅ ahora sí

const LOGO_SRC = "/images/TurnateLogo.png";

export default function Login() {
  const navigate = useNavigate();
  const { login: loginCtx } = useUser();

  // ✅ hooks ADENTRO del componente
  const [sp] = useSearchParams();
  const justRegistered = sp.get("registered") === "1";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiLogin(username.trim(), password); // { access_token, user }
      loginCtx(data);                                         // guarda token+user

      // Redirección: si venías con ?next=..., respetalo; si no, por rol
      const next = sp.get("next");
      const nextParam = next && next !== "/login" ? next : null;
      if (nextParam) {
        navigate(nextParam, { replace: true });
      } else {
        const rol = data?.user?.rol?.toLowerCase?.();
        if (rol === "emprendedor") {
          navigate("/turnos", { replace: true });  // calendario del panel
        } else {
          navigate("/codigo", { replace: true });  // pantalla pública de código
        }
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "No se pudo iniciar sesión.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-400 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/20 bg-white/90 backdrop-blur-sm shadow-xl p-6">
          <div className="flex justify-center mb-6">
            <img
              src={LOGO_SRC}
              alt="Turnate"
              className="h-14 w-auto drop-shadow-md select-none"
              draggable="false"
            />
          </div>

          <h1 className="text-xl font-semibold text-slate-800 text-center">Iniciar sesión</h1>

          {justRegistered && (
            <div className="mb-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-2 ring-1 ring-emerald-200">
              ¡Listo! Tu cuenta fue creada. Iniciá sesión para continuar.
            </div>
          )}

          <p className="text-sm text-slate-600 mt-1 text-center">
            Accedé a tu panel para gestionar servicios, horarios y turnos.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <label className="block">
              <span className="text-sm text-slate-700">Usuario o email</span>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-700">Contraseña</span>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-600">
            ¿No tenés cuenta?{" "}
            <Link to="/registro" className="text-sky-700 hover:underline">
              Registrate
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
