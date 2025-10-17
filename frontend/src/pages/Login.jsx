// src/pages/Login.jsx
import React, { useState, useContext } from "react";
import { UserContext } from "../context/UserContext.jsx";
import api, { setToken, readToken } from "../components/api";
import Button from "../components/Button";
import Input from "../components/Input";

const LOGO_SRC = "/images/TurnateLogo.png";

/* Modal simple sin dependencias externas (todo en este archivo) */
function SimpleModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-slate-800 font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const ctx = useContext(UserContext) || {};
  const { loginCtx, setUser } = ctx;

  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Modal "Olvidé mi contraseña" (sin tocar otros archivos)
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);

  // --- Login fallback directo a API (si no hay loginCtx en el contexto)
  const doLoginFallback = async () => {
    const hasAt = emailOrUser.includes("@");
    const payload = hasAt ? { email: emailOrUser, password } : { username: emailOrUser, password };

    // Intento #1
    try {
      const res = await api.post("/usuarios/login", payload);
      const token = res?.data?.token || res?.data?.access_token || res?.data?.jwt;
      const u = res?.data?.user || res?.data?.usuario || res?.data?.user_schema || res?.data;
      if (!token || !u) throw new Error("Respuesta de login incompleta");
      setToken(token);
      if (setUser) setUser(u);
      localStorage.setItem("user", JSON.stringify(u));
      return { user: u, token };
    } catch (err1) {
      // Intento #2
      try {
        const res = await api.post("/auth/login", payload);
        const token = res?.data?.token || res?.data?.access_token || res?.data?.jwt;
        const u = res?.data?.user || res?.data?.usuario || res?.data;
        if (!token || !u) throw new Error("Respuesta de login incompleta");
        setToken(token);
        if (setUser) setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
        return { user: u, token };
      } catch (err2) {
        const d = err2?.response?.data || err1?.response?.data;
        const m = d?.detail || d?.message || "No se pudo iniciar sesión";
        throw new Error(m);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      let u = null;
      let tok = null;

      if (typeof loginCtx === "function") {
        const hasAt = emailOrUser.includes("@");
        const result = await loginCtx(
          hasAt ? { email: emailOrUser, password } : { username: emailOrUser, password }
        );
        tok = result?.token || readToken();
        if (tok) setToken(tok);
        u = result?.user || result || null;
        if (u) {
          localStorage.setItem("user", JSON.stringify(u));
          if (setUser) setUser(u);
        }
      } else {
        const r = await doLoginFallback();
        u = r.user;
        tok = r.token;
      }

      setMsg("✅ Sesión iniciada");
      setTimeout(() => {
        const dest = u?.rol === "emprendedor" ? "/turnos" : "/reservar";
        window.location.assign(dest);
      }, 300);
    } catch (err) {
      setMsg(`⚠️ ${err.message || "Error al iniciar sesión"}`);
    } finally {
      setLoading(false);
    }
  };

  // Envío "Olvidé mi contraseña" SIN tocar otros archivos: probamos endpoints comunes
  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSending(true);
    setMsg("");
    try {
      const payload = { email: forgotEmail };
      const endpoints = [
        "/usuarios/recuperar",
        "/auth/forgot",
        "/usuarios/forgot",
        "/auth/password/forgot",
      ];
      let ok = false;
      let serverMsg = null;
      for (const p of endpoints) {
        try {
          const r = await api.post(p, payload);
          ok = true;
          serverMsg = r?.data?.detail || r?.data?.message || null;
          break;
        } catch (_) {}
      }
      if (!ok) throw new Error("No se pudo iniciar el proceso. Probá más tarde.");
      setMsg(serverMsg || "📬 Si el email existe, te enviamos instrucciones.");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err) {
      setMsg(`⚠️ ${err.message || "No se pudo enviar el email"}`);
    } finally {
      setForgotSending(false);
    }
  };

  return (
    <div className="pt-24">
      {/* Wrapper para centrar el card y empujar el footer al fondo */}
      <div className="min-h-[calc(100vh-240px)] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur">
          {/* Cabecera del formulario con logo + marca */}
          <div className="px-6 pt-6 text-center">
            <div className="inline-flex items-center gap-3 select-none">
              <img
                src={LOGO_SRC}
                alt="Turnate"
                className="h-12 w-auto"
                onError={(e) => (e.currentTarget.style.display = "none")}
                draggable="false"
              />
              <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-blue-600 to-emerald-400 bg-clip-text text-transparent">
                Turnate
              </span>
            </div>
            <h1 className="mt-3 text-xl font-semibold text-slate-800">Iniciar sesión</h1>
            <p className="text-sm text-slate-500">Accedé a tu cuenta para gestionar tus turnos.</p>
          </div>

          <div className="p-6">
            {msg && (
              <div
                className={`mb-4 rounded-lg px-3 py-2 text-sm ${
                  /⚠️|Error|No se pudo|incorrect/i.test(msg)
                    ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                }`}
              >
                {msg}
              </div>
            )}

            <form onSubmit={handleLogin} className="grid gap-3">
              <Input
                type="text"
                placeholder="Email o usuario"
                value={emailOrUser}
                onChange={(e) => setEmailOrUser(e.target.value)}
                required
                className="rounded-xl bg-white/80"
              />
              <Input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-xl bg-white/80"
              />

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-blue-600 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
                {/* Podrías agregar "Recordarme" acá si lo necesitás más adelante */}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-1 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-400 text-white font-bold py-2 px-4 shadow-lg ring-1 ring-blue-300/40 disabled:opacity-60"
              >
                {loading ? "Ingresando…" : "Ingresar"}
              </Button>
            </form>

            <div className="mt-4 text-sm text-gray-600 text-center">
              ¿No tenés cuenta?{" "}
              <a href="/registro" className="text-blue-600 underline">
                Registrate
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Olvidé mi contraseña (best-effort, sin tocar otros archivos) */}
      <SimpleModal open={forgotOpen} title="Recuperar contraseña" onClose={() => setForgotOpen(false)}>
        <form onSubmit={handleForgot} className="grid gap-3">
          <Input
            type="email"
            placeholder="Tu email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            required
            className="rounded-xl bg-white/80"
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={forgotSending}
              className="rounded-xl bg-blue-600 text-white font-semibold px-4 py-2 disabled:opacity-60"
            >
              {forgotSending ? "Enviando…" : "Enviar"}
            </Button>
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="rounded-xl border border-slate-300 bg-white text-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Intentaremos los endpoints más comunes de recuperación. Si tu backend
            no tiene esta ruta, verás un aviso y no se tocará ningún archivo extra.
          </p>
        </form>
      </SimpleModal>
    </div>
  );
}
