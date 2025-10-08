// src/pages/Perfil.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { api } from "../services/api";
import CodigoShareCard from "../components/CodigoShareCard";

const cx = (...c) => c.filter(Boolean).join(" ");

export default function Perfil() {
  const navigate = useNavigate();
  const { user /*, setUser*/ } = useUser();

  const [form, setForm] = useState({
    username: "",
    email: "",
    nombre: "",
    apellido: "",
    dni: "",
  });

  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileRef = useRef(null);

  // datos del emprendedor (si existiera)
  const [isEmprendedor, setIsEmprendedor] = useState(false);
  const [codigoCliente, setCodigoCliente] = useState("");
  const [checkingEmp, setCheckingEmp] = useState(true);
  const [activando, setActivando] = useState(false);

  // --- Link público (reservas por código) ---
  const [code, setCode] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // precargar código si existe
    (async () => {
      try {
        const { data: emp } = await api.get("/emprendedores/mi");
        if (emp?.codigo_cliente) {
          setCode(String(emp.codigo_cliente).toUpperCase());
          setShowLink(true);
        }
      } catch {
        // sin back real, ignorar
      }
    })();
  }, []);

  async function generarLink(regenerar = false) {
    try {
      setMsg("");
      const { data } = await api.post("/emprendedores/generar-codigo", { regenerar });
      const nuevo = (data?.codigo || "").toUpperCase();
      setCode(nuevo);
      setShowLink(true);
      setMsg(regenerar ? "Código regenerado." : "Código generado.");
      setTimeout(() => setMsg(""), 1600);
    } catch {
      setMsg("No se pudo generar el link.");
      setTimeout(() => setMsg(""), 1800);
    }
  }

  async function copiarLink() {
    if (!code) return;
    const url = `${location.origin}/reservar/${code}`;
    await navigator.clipboard.writeText(url);
    setMsg("Link copiado");
    setTimeout(() => setMsg(""), 1600);
  }

  function abrirGrillaPublica() {
    if (!code) return generarLink(false); // si no hay, genera y muestra
    window.open(`/reservar/${code}`, "_blank", "noopener,noreferrer");
  }

  // Prefill con lo que tengas en el contexto
  useEffect(() => {
    if (!user) return;
    setForm({
      username: user.username || "",
      email: user.email || "",
      nombre: user.nombre || "",
      apellido: user.apellido || "",
      dni: user.dni || "",
    });
    setAvatarPreview(user.avatar_url || null);
  }, [user]);

  // Intentar traer info de emprendedor (si hay)
useEffect(() => {
  // La condición de emprendedor depende SOLO del rol del usuario.
  setIsEmprendedor((user?.rol || "").toLowerCase() === "emprendedor");
  setCheckingEmp(false);
}, [user]);
  

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onPickImage = () => fileRef.current?.click();

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setOkMsg("");
    setErrMsg("");

    try {
      // 1) Perfil (campos)
      await api.patch("/usuarios/me", {
        username: form.username || null,
        email: form.email || null,
        nombre: form.nombre || null,
        apellido: form.apellido || null,
        dni: form.dni || null,
      });

      // 2) Avatar (si cargó uno)
      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        await api.post("/usuarios/me/avatar", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setOkMsg("Cambios guardados correctamente.");
      setTimeout(() => setOkMsg(""), 2500);
    } catch (err) {
      console.error(err);
      setErrMsg("No se pudieron guardar los cambios.");
      setTimeout(() => setErrMsg(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  // ---- CTA Emprendedor ----
  const activarPlanEmprendedor = async () => {
    if (!user) return;
    setActivando(true);
    try {
      // 1) Intento endpoint real (si existe)
      try { await api.post("/pagos/suscribir", { plan: "emprendedor_mensual" }); } catch (_) {}
      try { await api.post("/usuarios/activar_emprendedor"); }
      catch { try { await api.put(`/usuarios/${user.id}/activar_emprendedor`); } catch { } }

      // 2) Marcar rol y navegar
      const u = { ...(user || {}), rol: "emprendedor" };
      localStorage.setItem("turnate_user", JSON.stringify(u));
      setIsEmprendedor(true);

      // Generá código al toque para que ya esté disponible
      try { await generarLink(false); } catch {}

      navigate("/emprendimiento", { replace: true });
    } catch (e) {
      console.error(e);
      // Fallback 100% simulado
      const u = { ...(user || {}), rol: "emprendedor" };
      localStorage.setItem("turnate_user", JSON.stringify(u));
      setIsEmprendedor(true);
      try { await generarLink(false); } catch {}
      navigate("/emprendimiento", { replace: true });
    } finally {
      setActivando(false);
    }
  };

  // Código público (si sos emprendedor) - copiar solo el código (legacy)
  const copiarCodigo = async () => {
    const codeToCopy = (code || codigoCliente || "").toUpperCase().trim();
    if (!codeToCopy) return;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setOkMsg("¡Código copiado!");
      setTimeout(() => setOkMsg(""), 1500);
    } catch {
      setErrMsg("No se pudo copiar el código.");
      setTimeout(() => setErrMsg(""), 2000);
    }
  };

  const abrirGrillaDesdeCodigoCliente = () => {
    const codeToOpen = (code || codigoCliente || "").toUpperCase().trim();
    if (!codeToOpen) return;
    const url = `${window.location.origin}/reservar/${encodeURIComponent(codeToOpen)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="w-full space-y-6">
      {/* Tarjeta perfil (sin borde superior grueso) */}
      <div className="rounded-3xl p-[1px] bg-gradient-to-br from-blue-600 via-sky-400 to-teal-300 shadow-lg">
        <div className="rounded-3xl bg-white/90 backdrop-blur-md">
          <div className="px-5 sm:px-8 py-6 sm:py-8">
            {/* Avatar + subir */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div
                  className={cx(
                    "h-28 w-28 sm:h-32 sm:w-32 rounded-full grid place-items-center",
                    "bg-gradient-to-b from-sky-200 to-teal-100 text-slate-400 border border-white shadow-inner overflow-hidden"
                  )}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm">Sin foto</span>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={onPickImage}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-white text-sm font-semibold shadow hover:bg-sky-700"
                >
                  Subir foto <span className="text-white/90">+</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFile}
                />
              </div>
            </div>

            {/* Mensajes */}
            {okMsg && (
              <div className="mt-5 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-2 ring-1 ring-emerald-200">
                {okMsg}
              </div>
            )}
            {errMsg && (
              <div className="mt-5 rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2 ring-1 ring-rose-200">
                {errMsg}
              </div>
            )}

            {/* Formulario de datos personales */}
            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Usuario */}
                <div>
                  <label className="block text-xs font-semibold text-sky-700 mb-1">Usuario</label>
                  <input
                    name="username"
                    type="text"
                    value={form.username}
                    onChange={onChange}
                    placeholder="Usuario"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                {/* Correo */}
                <div>
                  <label className="block text-xs font-semibold text-sky-700 mb-1">Correo</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="demo@turnate.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-sky-700 mb-1">Nombre</label>
                  <input
                    name="nombre"
                    type="text"
                    value={form.nombre}
                    onChange={onChange}
                    placeholder="Nombre"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                {/* Apellido */}
                <div>
                  <label className="block text-xs font-semibold text-sky-700 mb-1">Apellido</label>
                  <input
                    name="apellido"
                    type="text"
                    value={form.apellido}
                    onChange={onChange}
                    placeholder="Apellido"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
              </div>

              {/* DNI */}
              <div>
                <label className="block text-xs font-semibold text-sky-700 mb-1">DNI</label>
                <input
                  name="dni"
                  type="text"
                  value={form.dni}
                  onChange={onChange}
                  placeholder="DNI"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-emerald-500 px-6 py-3 text-white font-semibold shadow hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* CTA para pasar a Emprendedor (si aún no lo es) */}
      {!checkingEmp && !isEmprendedor && (
        <div className="rounded-3xl p-[1px] bg-gradient-to-br from-blue-600 via-sky-400 to-emerald-400 shadow-lg">
          <div className="rounded-3xl bg-white/95 backdrop-blur-md">
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">
                    ¿Querés pasarte a <span className="text-sky-600">Emprendedor</span>?
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">
                    Activá tu plan y empezá a crear tu negocio, servicios y horarios,
                    y recibí un <b>código</b> para que tus clientes reserven online.
                  </p>
                  <ul className="mt-3 text-sm text-slate-600 list-disc pl-5">
                    <li>Gestión de turnos y agenda del día</li>
                    <li>Servicios con duraciones personalizadas</li>
                    <li>Horarios y bloqueos por día</li>
                    <li>Link público con tu código para reservas</li>
                  </ul>
                </div>
                <div className="text-center md:text-right">
                  <div className="text-3xl font-extrabold bg-gradient-to-r from-sky-600 to-emerald-500 bg-clip-text text-transparent">
                    $29.990 <span className="text-base font-semibold text-slate-500">/ mes</span>
                  </div>
                  <button
                    onClick={activarPlanEmprendedor}
                    disabled={activando}
                    className="mt-3 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-500 px-5 py-3 text-white font-semibold shadow hover:brightness-110 disabled:opacity-60"
                  >
                    {activando ? "Procesando…" : "Suscribirme"}
                  </button>
                  <p className="text-xs text-slate-500 mt-2">
                    Active ya y ordene su tiempo!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bloque de Código para clientes (si ya es emprendedor o existe negocio) */}
      {!checkingEmp && isEmprendedor && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Botón principal */}
            <button
              type="button"
              onClick={() => generarLink(false)}
              className="rounded-full bg-gradient-to-r from-sky-600 to-emerald-500 text-white text-sm font-semibold px-3 py-2 shadow hover:brightness-110"
            >
              {code ? "Volver a mostrar link" : "Generar link"}
            </button>

            {/* Si ya hay código, acciones rápidas */}
            {code && (
              <>
                <button
                  type="button"
                  onClick={copiarLink}
                  className="rounded-full border border-slate-300 bg-white text-slate-700 text-sm font-semibold px-3 py-2"
                >
                  Copiar
                </button>
                <button
                  type="button"
                  onClick={abrirGrillaPublica}
                  className="rounded-full bg-sky-700 text-white text-sm font-semibold px-3 py-2 shadow hover:bg-sky-800"
                >
                  Abrir
                </button>
                <button
                  type="button"
                  onClick={copiarCodigo}
                  className="rounded-full border border-slate-300 bg-white text-slate-700 text-sm font-semibold px-3 py-2"
                >
                  Copiar código
                </button>
              </>
            )}
          </div>

          {/* Tarjeta con el link para compartir */}
          {showLink && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              {code ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-sm">
                    <div className="text-slate-600">Compartí este link con tu cliente:</div>
                    <div className="mt-1 font-mono text-slate-800 break-all">
                      {`${location.origin}/reservar/${code}`}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Código: <b className="tracking-widest">{code}</b>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copiarLink}
                      className="rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold px-3 py-2"
                    >
                      Copiar link
                    </button>
                    <button
                      type="button"
                      onClick={abrirGrillaPublica}
                      className="rounded-lg bg-sky-700 text-white text-sm font-semibold px-3 py-2 shadow hover:bg-sky-800"
                    >
                      Abrir
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600">Generando link…</div>
              )}

              {!!msg && <div className="mt-2 text-xs text-emerald-700">{msg}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
