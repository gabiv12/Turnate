import React, { useContext, useEffect, useRef, useState } from "react";
import { UserContext } from "../context/UserContext";
import api, { readToken, setToken } from "../components/api";
import Loader from "../components/Loader";
import Button from "../components/Button";
import Input from "../components/Input";

/** Modal simple con opción de "blocking" para no cerrar mientras hay procesos críticos */
function SimpleModal({ open, title, onClose, blocking = false, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => {
      if (e.key === "Escape" && !blocking) onClose?.();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, blocking, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className={`absolute inset-0 ${blocking ? "bg-slate-900/70" : "bg-slate-900/50"}`}
        onClick={() => (!blocking ? onClose?.() : null)}
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          ref={dialogRef}
          className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 id="modal-title" className="text-slate-800 font-semibold">{title}</h3>
            <button
              onClick={() => (!blocking ? onClose?.() : null)}
              className={`rounded-lg px-2 py-1 text-sm ${blocking ? "text-slate-400" : "text-slate-600 hover:bg-slate-100"}`}
              aria-label="Cerrar"
              disabled={blocking}
              title={blocking ? "Terminando la activación…" : "Cerrar"}
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

export default function Perfil() {
  const { user, setUser } = useContext(UserContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // ======= FORM USER =======
  const [formUser, setFormUser] = useState({
    username: "",
    email: "",
    telefono: "",
    nombre: "",
  });

  // ======= EMPRENDEDOR =======
  const [empData, setEmpData] = useState(null);
  const [activando, setActivando] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payStep, setPayStep] = useState("idle"); // idle | checking | activating | success | error
  const [payError, setPayError] = useState("");

  // auto-hide banners
  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(""), 3000);
    return () => clearTimeout(t);
  }, [mensaje]);

  // ------- HELPERS ----------
  async function fetchEmprendedorWithFallbacks(uid) {
    try { const r = await api.get("/emprendedores/mi"); return r?.data || null; } catch {}
    try { const r = await api.get("/usuarios/me/emprendedor"); return r?.data || null; } catch {}
    if (uid) {
      try { const r = await api.get(`/usuarios/${uid}/emprendedor`); return r?.data || null; } catch {}
    }
    return null;
  }

  async function fetchUserWithFallbacks() {
    try { const r = await api.get("/usuarios/me"); return r?.data || null; } catch {}
    try { const r = await api.get("/auth/me"); return r?.data || null; } catch {}
    try { const r = await api.get("/me"); return r?.data || null; } catch {}
    return null;
  }

  async function updateUserWithFallbacks(uid, payload) {
    const intents = [
      { m: "patch", u: "/usuarios/me" },
      uid ? { m: "put", u: `/usuarios/${uid}` } : null,
      uid ? { m: "put", u: `/usuarios/update/${uid}` } : null,
      { m: "put", u: "/usuarios/me" },
      { m: "post", u: "/usuarios/update" },
      { m: "post", u: "/usuarios/me" },
      { m: "put", u: "/usuarios" },
    ].filter(Boolean);

    let last404 = null;
    for (const i of intents) {
      try {
        await api[i.m](i.u, payload);
        return true;
      } catch (e) {
        const s = e?.response?.status;
        if (s !== 404 && s !== 405) throw e;
        last404 = e;
      }
    }
    const err = new Error("No existe un endpoint de actualización de usuario en esta API (todas las rutas devolvieron 404/405).");
    err.cause = last404;
    err.status = 404;
    throw err;
  }
  // --------------------------

  // Prefill reactivo cuando cambia el user del contexto
  useEffect(() => {
    setFormUser({
      username: user?.username || "",
      email: user?.email || "",
      telefono: user?.telefono || "",
      nombre: user?.nombre || user?.username || "",
    });
  }, [user?.username, user?.email, user?.telefono, user?.nombre]);

  // Carga inicial + recarga cuando cambie user.id
  useEffect(() => {
    let cancelled = false;
    const t = readToken();
    if (t) setToken(t);

    if (!user?.id || !t) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const emp = await fetchEmprendedorWithFallbacks(user.id);
        if (!cancelled) setEmpData(emp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const onUserChange = (e) => {
    const { name, value } = e.target;
    setFormUser((p) => ({ ...p, [name]: value }));
  };

  const saveUser = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    // aseguro Authorization
    const t = readToken();
    if (t) setToken(t);

    setSaving(true);
    try {
      const payload = {
        username: formUser.username?.trim(),
        email: formUser.email?.trim(),
        telefono: formUser.telefono?.trim() || null,
        nombre: formUser.nombre?.trim() || null,
      };

      await updateUserWithFallbacks(user.id, payload);

      // re-fetch del usuario desde el back para alinear todo
      try {
        const fresh = await fetchUserWithFallbacks();
        if (fresh) {
          setUser?.(fresh);
          localStorage.setItem("user", JSON.stringify(fresh));
          setFormUser({
            username: fresh.username || "",
            email: fresh.email || "",
            telefono: fresh.telefono || "",
            nombre: fresh.nombre || fresh.username || "",
          });
        } else {
          // si no hay /usuarios/me, al menos actualizo con lo enviado
          const merged = { ...user, ...payload };
          setUser?.(merged);
          localStorage.setItem("user", JSON.stringify(merged));
        }
      } catch {
        const merged = { ...user, ...payload };
        setUser?.(merged);
        localStorage.setItem("user", JSON.stringify(merged));
      }

      setMensaje("✅ Perfil actualizado");
    } catch (err) {
      const d = err?.response?.data;
      setMensaje(`⚠️ ${d?.detail || d?.message || err?.message || "No se pudo actualizar el perfil"}`);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (txt) => {
    try {
      await navigator.clipboard.writeText(String(txt || ""));
      setMensaje("✅ Copiado");
    } catch {
      setMensaje("⚠️ No se pudo copiar");
    }
  };

  const activarPlanEmprendedor = async () => {
    const t = readToken();
    if (!t) {
      setPayError("Sesión expirada. Iniciá sesión nuevamente.");
      setPayStep("error");
      return;
    }
    setToken(t);

    setActivando(true);
    setPayError("");
    setPayStep("checking");

    try {
      await new Promise((r) => setTimeout(r, 300)); // UX
      setPayStep("activating");

      const res = await api.post("/emprendedores/activar");
      const { token: newToken, user: updatedUser } = res?.data || {};

      if (newToken) setToken(newToken);

      const mergedUser = updatedUser
        ? { ...updatedUser, rol: updatedUser?.rol || "emprendedor", es_emprendedor: true }
        : { ...(user || {}), rol: "emprendedor", es_emprendedor: true };

      setUser?.(mergedUser);
      localStorage.setItem("user", JSON.stringify(mergedUser));

      try {
        const emp = await fetchEmprendedorWithFallbacks(user?.id);
        setEmpData(emp);
      } catch {}

      setMensaje("✅ Plan activado");
      setPayStep("success");
      setTimeout(() => setPayOpen(false), 800);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Sesión expirada. Iniciá sesión nuevamente.";
      setPayError(msg);
      setPayStep("error");
    } finally {
      setActivando(false);
    }
  };

  if (loading) return <Loader />;

  const isEmpActivo = !!empData;
  const publicCode = empData?.codigo_cliente || "";

  return (
    <div className="relative w-full max-w-6xl mx-auto mt-6 px-3 sm:px-4 md:px-6">
      {/* Título + CTA Reservar */}
      <div className="-mx-3 sm:-mx-4 md:-mx-6">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-400 p-4 sm:p-5 md:p-6 text-white shadow">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">
                Tu Perfil
              </h1>
              <p className="text-xs sm:text-sm md:text-base/relaxed opacity-90">
                Completá tus datos. El público reserva con tu <b>código</b> o con tu <b>link</b>.
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-[11px] sm:text-xs opacity-90">
                <li>El código es único: compartilo para que te reserven sin chatear.</li>
                <li>Desde <b>Emprendimiento</b> podés copiar el código o el link público.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {mensaje && (
        <div
          className={`mb-5 rounded-xl px-4 py-2 text-sm font-medium break-words ${
            /⚠️|error|incorrecta|falló|422|400|404|500/i.test(mensaje)
              ? "bg-red-50 text-red-700 ring-1 ring-red-200"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          }`}
        >
          {mensaje}
        </div>
      )}

      {/* Plan Emprendedor */}
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-400 shadow-2xl mb-6">
        <div className="relative rounded-2xl bg-white/85 backdrop-blur-md">
          <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-300" />
          <div className="p-4 sm:p-6 md:p-8 grid gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-blue-800">Plan Emprendedor</h2>
                <p className="text-sm text-gray-600">
                  Activá el plan para configurar <b>Servicios</b>, <b>Horarios</b> y recibir <b>Turnos</b>.
                </p>
              </div>
              <span
                className={`self-start sm:self-auto text-xs px-3 py-1 rounded-full ring-1 ${
                  isEmpActivo ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-gray-50 text-gray-600 ring-gray-200"
                }`}
              >
                {isEmpActivo ? "Activo" : "Inactivo"}
              </span>
            </div>

            {!isEmpActivo ? (
              <div className="grid gap-3 rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50 to-cyan-50 p-3 sm:p-4">
                <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                  <img
                    src="/images/UpgradeEmprendedor.png"
                    alt="Conseguí más clientes con tu agenda pública"
                    className="w-full h-36 sm:h-40 md:h-48 object-cover bg-slate-100"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>
                <p className="text-sm text-blue-900">
                  Convertite en <b>emprendedor</b> y publicá tu agenda: recibí reservas 24/7, gestioná servicios y horarios en minutos.
                </p>
                <ul className="text-xs text-slate-700 list-disc ml-5 space-y-1">
                  <li>Link con código público para compartir.</li>
                  <li>Agenda visible desde la sección “Reservar”.</li>
                  <li>CRUD de <b>Turnos</b>, <b>Servicios</b> y <b>Horarios</b> todo en un lugar.</li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => { setPayOpen(true); setPayStep("idle"); setPayError(""); }}
                    className="rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 text-white font-bold py-2 px-4 shadow-lg ring-1 ring-blue-300/40"
                  >
                    Activar plan de Emprendedor
                  </Button>
                  <a
                    href="/reservar"
                    className="rounded-full bg-white text-blue-700 ring-1 ring-blue-200 font-semibold py-2 px-4 text-center"
                  >
                    Ver agendas públicas
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-emerald-900">
                    ¡Tu plan está activo!
                  </p>
                  {publicCode && (
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-md bg-white px-2 py-1 ring-1 ring-emerald-200 tracking-widest break-all">
                        {publicCode}
                      </code>
                      <button
                        onClick={() => copyToClipboard(publicCode)}
                        className="rounded-lg bg-white text-emerald-700 px-3 py-1.5 text-xs font-semibold ring-1 ring-emerald-200 hover:bg-emerald-100"
                      >
                        Copiar
                      </button>
                      <a
                        href={`/reservar/${encodeURIComponent(publicCode)}`}
                        className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700"
                      >
                        Abrir agenda
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  <a
                    href="/emprendimiento"
                    className="rounded-full bg-white text-blue-700 ring-1 ring-blue-200 font-semibold py-2 px-4 text-center"
                  >
                    Editar Emprendimiento
                  </a>
                  <a
                    href="/turnos"
                    className="rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 text-white font-bold py-2 px-4 shadow-lg ring-1 ring-blue-300/40 text-center"
                  >
                    Ir a Turnos
                  </a>
                  <a
                    href="/reservar"
                    className="rounded-full bg-white text-blue-700 ring-1 ring-blue-200 font-semibold py-2 px-4 text-center"
                  >
                    Reservar
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal simulación de pago mejorado */}
      <SimpleModal
        open={payOpen}
        title="Activar plan de Emprendedor"
        onClose={() => (activando ? null : setPayOpen(false))}
        blocking={activando || payStep === "activating"}
      >
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden ring-1 ring-slate-200">
            <img
              src="/images/UpgradeEmprendedor.png"
              alt="Hacé crecer tu negocio con tu turnera online"
              className="w-full h-36 sm:h-40 md:h-48 object-cover bg-slate-100"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>

          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${
                payStep === "success" ? "bg-emerald-500" :
                payStep === "error" ? "bg-rose-500" :
                payStep === "activating" || activando ? "bg-amber-500 animate-pulse" :
                "bg-slate-400"
              }`} />
              <span className="text-slate-700">
                {payStep === "idle" && "Listo para activar."}
                {payStep === "checking" && "Verificando sesión…"}
                {payStep === "activating" && "Activando tu plan…"}
                {payStep === "success" && "¡Plan activado! Cerrando…"}
                {payStep === "error" && `Error: ${payError || "No se pudo activar."}`}
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-700">
            Aqui se realizara el pago. Al activarlo, se habilitan la gestión y tu agenda pública.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={activarPlanEmprendedor}
              disabled={activando || payStep === "activating" || payStep === "success"}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-emerald-400 text-white font-bold py-2 px-4 shadow-lg ring-1 ring-blue-300/40 disabled:opacity-60"
            >
              {activando || payStep === "activating" ? "Activando…" : "Confirmar activación"}
            </Button>

            {payStep !== "activating" && (
              <button
                onClick={() => setPayOpen(false)}
                className="rounded-xl border border-slate-300 bg-white text-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                {payStep === "success" ? "Cerrar" : "Cancelar"}
              </button>
            )}

            {payStep === "error" && (
              <button
                onClick={() => { setPayStep("idle"); setPayError(""); }}
                className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 px-4 py-2 text-sm font-semibold hover:bg-amber-100"
                title="Volver a intentar"
              >
                Reintentar
              </button>
            )}
          </div>

          {payStep === "error" && (
            <div className="rounded-lg bg-rose-50 text-rose-700 ring-1 ring-rose-200 px-3 py-2 text-sm">
              {payError || "No se pudo activar el plan."}{" "}
              {payError?.toLowerCase().includes("sesión") && (
                <a href="/login" className="underline font-semibold">Iniciá sesión</a>
              )}
            </div>
          )}
        </div>
      </SimpleModal>

      {/* Datos de usuario (SIN avatar) */}
      <div className="rounded-2xl border border-gray-100 bg-white/90 p-4 sm:p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Datos de usuario</h3>

        <form onSubmit={saveUser} className="grid grid-cols-1 gap-6 items-start">
          <div className="grid gap-4">
            <label className="block">
              <span className="block text-[11px] font-semibold text-sky-700 mb-1">Usuario</span>
              <Input
                type="text"
                name="username"
                placeholder="Usuario"
                value={formUser.username}
                onChange={onUserChange}
                required
                className="rounded-xl bg-white/80"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-[11px] font-semibold text-sky-700 mb-1">Email</span>
                <Input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formUser.email}
                  onChange={onUserChange}
                  required
                  className="rounded-xl bg-white/80"
                />
              </label>

              <label className="block">
                <span className="block text-[11px] font-semibold text-sky-700 mb-1">Teléfono (opcional)</span>
                <Input
                  type="text"
                  name="telefono"
                  placeholder="Teléfono (opcional)"
                  value={formUser.telefono}
                  onChange={onUserChange}
                  className="rounded-xl bg-white/80"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="block text-[11px] font-semibold text-sky-700 mb-1">Nombre (opcional)</span>
                <Input
                  type="text"
                  name="nombre"
                  placeholder="Nombre (opcional)"
                  value={formUser.nombre}
                  onChange={onUserChange}
                  className="rounded-xl bg-white/80"
                />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-emerald-400 text-white font-bold py-3 px-4 shadow-lg ring-1 ring-blue-300/40 disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Sugerencias mini */}
      <div className="mt-4 rounded-2xls border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium text-slate-700 mb-2">Sugerencias</div>
        <ul className="text-xs text-slate-600 list-disc ml-5 space-y-1 break-words">
          <li>
            Compartí tu link público:{" "}
            <code className="px-1 bg-slate-100 rounded break-all">
              {publicCode ? `/reservar/${publicCode}` : "/reservar/—"}
            </code>
          </li>
          <li>Completá tu emprendimiento para mostrar datos claros al reservar.</li>
          <li>Desde <b>Turnos</b> administrás tus servicios, horarios y agenda.</li>
        </ul>
      </div>
    </div>
  );
}
