// src/pages/EmprendedorForm.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as apiSvc from "../services/api";
const api = apiSvc.api || apiSvc.default || apiSvc;

const SAFE_REGEX = /[A-HJ-NP-Z2-9]/g;         // sin I, O, 0, 1
const SAFE_PATTERN = "^[A-HJ-NP-Z2-9]{4,12}$"; // 4–12 chars recomendados

export default function EmprendedorForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ id: null, nombre: "", telefono: "", direccion: "", rubro: "", descripcion: "", codigo_cliente: "" });
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [hintMsg, setHintMsg] = useState("");

  const codeInputRef = useRef(null);

  // Logo (preview local; upload real después)
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const logoRef = useRef(null);
  const pickLogo = () => logoRef.current?.click();
  const onLogoChange = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setLogoFile(f); const reader = new FileReader(); reader.onload = () => setLogoPreview(reader.result); reader.readAsDataURL(f);
  };

  const sanitizeCode = (val) => (val || "").toUpperCase().match(SAFE_REGEX)?.join("") || "";

  function parseError(err, action = "guardar") {
    const res = err?.response; if (res) {
      const s = res.status; const d = res.data || {}; const detail = d.detail || d.message || (typeof d === "string" ? d : "");
      if (s === 401) return { user: "Tu sesión expiró o no estás autenticado.", hint: "Volvé a iniciar sesión." };
      if (s === 403) return { user: "No tenés permisos para esta acción.", hint: "Pedí habilitación al administrador." };
      if (s === 404) return { user: "No encontramos tu emprendimiento.", hint: "Crealo primero y luego volvé a intentar." };
      if (s === 409) return { user: "El código público ya está en uso.", hint: "Probá con otro código (sin 0/1/O/I)." };
      if (s === 422 || s === 400) return { user: "Datos inválidos o incompletos.", hint: detail || "Completá Nombre y Código." };
      if (s >= 500) return { user: "El servidor tuvo un problema.", hint: "Si persiste, contactá al administrador." };
      return { user: detail || "No se pudo completar la operación.", hint: "" };
    }
    if (err?.request || err?.code === "ERR_NETWORK") return { user: "No se pudo conectar con el servidor.", hint: "Verificá back encendido, URL y CORS." };
    return { user: "No se pudo completar la operación.", hint: "" };
  }

  // link público (para compartir)
  const publicLink = useMemo(() => {
    const base = window.location?.origin || ""; const c = form.codigo_cliente?.trim(); return c ? `${base}/reservar/${c}` : "";
  }, [form.codigo_cliente]);

  // cargar datos
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setErrMsg(""); setHintMsg("");
      try {
        const r = await api.get("/emprendedores/mi");
        const e = r?.data || null;
        if (mounted && e) {
          setForm({
            id: e.id ?? null,
            nombre: e.nombre || "",
            telefono: e.telefono || e.telefono_contacto || "",
            direccion: e.direccion || "",
            rubro: e.rubro || "",
            descripcion: e.descripcion || "",
            codigo_cliente: sanitizeCode(e.codigo_cliente || e.codigo || e.code || ""),
          });
          setExists(true);
        } else if (mounted) setExists(false);
      } catch {
        if (mounted) setExists(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onChange = (e) => { const { name, value } = e.target; setForm((p) => ({ ...p, [name]: name === "codigo_cliente" ? sanitizeCode(value) : value })); };

  const shareOrCopy = async () => {
    const url = publicLink; if (!url) return;
    try { if (navigator.share) await navigator.share({ title: "Mi agenda", text: "Reservá tu turno acá:", url }); else await navigator.clipboard.writeText(url);
      setOkMsg("¡Enlace listo para compartir!"); setTimeout(() => setOkMsg(""), 1600);
    } catch {}
  };

  const onSubmit = async (e) => {
    e.preventDefault(); if (saving) return;
    if (!form.nombre?.trim()) { setErrMsg("Ingresá el nombre del negocio."); setTimeout(()=>setErrMsg(""),2400); return; }
    const codigoFinal = sanitizeCode(form.codigo_cliente);
    if (!exists && !new RegExp(SAFE_PATTERN).test(codigoFinal)) { setErrMsg("Definí un código válido (4 a 12 caracteres, sin 0/1/O/I)."); setTimeout(()=>setErrMsg(""),2600); return; }

    setSaving(true); setOkMsg(""); setErrMsg(""); setHintMsg("");
    const payload = {
      nombre: form.nombre?.trim(),
      telefono_contacto: form.telefono?.trim() || null,
      direccion: form.direccion?.trim() || null,
      rubro: form.rubro?.trim() || null,
      descripcion: form.descripcion?.trim() || null,
      codigo_cliente: codigoFinal,
      codigo: codigoFinal,
    };

    try {
      if (!exists) {
        try { await api.post("/emprendedores/activar"); setExists(true); } catch (e) { if (e?.response?.status !== 404 && e?.response?.status !== 405) throw e; }
      }
      await api.put("/emprendedores/mi", payload);

      // upload de logo si existe (silencioso, opcional)
      if (logoFile) {
        try { const fd = new FormData(); fd.append("logo", logoFile); await api.post("/emprendedores/mi/logo", fd, { headers: { "Content-Type": "multipart/form-data" } }); } catch {}
      }

      setOkMsg("¡Emprendimiento guardado!"); setTimeout(()=>setOkMsg(""),2200);
      try { const r = await api.get("/emprendedores/mi"); const e = r?.data || null; if (e) setForm((p) => ({ ...p, id: e.id ?? p.id, codigo_cliente: sanitizeCode(e.codigo_cliente || e.codigo || p.codigo_cliente) })); } catch {}
    } catch (err) {
      const { user, hint } = parseError(err, "guardar"); setErrMsg(user || "No se pudo guardar."); setHintMsg(hint || "");
    } finally { setSaving(false); }
  };

  const hasNombre = !!form.nombre?.trim();
  const hasCodigo = !!form.codigo_cliente?.trim();
  const isReady = hasNombre && hasCodigo;

  const tips = useMemo(() => {
    const arr = [];
    if (!hasNombre) arr.push("Ingresá el nombre comercial.");
    if (!hasCodigo) arr.push("Elegí un código público fácil de recordar.");
    if (!form.telefono?.trim()) arr.push("Agregá un teléfono de contacto.");
    if (!form.direccion?.trim()) arr.push("Completá la dirección (opcional, ayuda a tus clientes).");
    if (!form.descripcion?.trim()) arr.push("Escribí una breve descripción de tus servicios.");
    if (!logoPreview) arr.push("Sumá un logo para identificar tu marca.");
    return arr.length ? arr : ["¡Todo listo! Guardá los cambios."];
  }, [hasNombre, hasCodigo, form.telefono, form.direccion, form.descripcion, logoPreview]);

  if (loading) return <div className="py-8 text-center text-slate-500 text-sm">Cargando…</div>;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 space-y-6">
      {/* Frase de ayuda con más contraste */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm text-sky-900">
        <div className="text-sm">
          <b>¿Cómo se ve en público?</b> Cualquiera puede entrar a {" "}
          <code className="bg-white ring-1 ring-sky-200 rounded px-1 break-all">/reservar/&lt;código&gt;</code> y ver tu agenda.
        </div>
      </div>

      {/* Logo */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
        <div className="grid grid-cols-[96px_1fr] gap-4 items-center">
          <div className="h-24 w-24 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden grid place-items-center">
            {logoPreview ? <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" /> : <span className="text-slate-400 text-xs">Sin logo</span>}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Logo del negocio (opcional)</div>
            <p className="text-xs text-slate-600">Subí una imagen para mostrar tu marca en la página pública.</p>
            <div className="mt-2">
              <button type="button" onClick={pickLogo} className="rounded-xl bg-sky-600 px-3 py-2 text-white text-sm font-semibold hover:bg-sky-700">Subir logo</button>
              <input ref={logoRef} type="file" accept="image/*" hidden onChange={onLogoChange} />
            </div>
          </div>
        </div>
      </div>

      {/* Form principal */}
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-sky-800 mb-1">Nombre comercial</label>
              <input name="nombre" value={form.nombre} onChange={onChange} placeholder="Ej: Estética Florencia" className="w-full h-11 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sky-800 mb-1">Teléfono</label>
              <input name="telefono" type="tel" value={form.telefono} onChange={onChange} placeholder="Ej: +54 9 11 5555-5555" className="w-full h-11 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sky-800 mb-1">Dirección</label>
              <input name="direccion" value={form.direccion} onChange={onChange} placeholder="Calle 123, Ciudad" className="w-full h-11 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sky-800 mb-1">Rubro</label>
              <input name="rubro" value={form.rubro} onChange={onChange} placeholder="Ej: Peluquería, Estética…" className="w-full h-11 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sky-800 mb-1">Código para clientes (único)</label>
              <div className="flex gap-2">
                <input ref={codeInputRef} name="codigo_cliente" pattern={SAFE_PATTERN} value={form.codigo_cliente} onChange={onChange} placeholder="ABC234" className="flex-1 h-11 rounded-xl border border-slate-200 px-3 py-2 tracking-widest uppercase focus:ring-2 focus:ring-sky-300" />
                <button type="button" onClick={shareOrCopy} disabled={!publicLink} className="rounded-xl bg-sky-700 text-white text-sm font-semibold px-3 py-2 shadow hover:bg-sky-800 disabled:opacity-60">Compartir</button>
              </div>
              <p className="text-xs text-slate-600 mt-1">Tus clientes reservan en {" "}<code className="bg-slate-50 ring-1 ring-slate-200 rounded px-1 break-all">/reservar/&lt;código&gt;</code>.</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-sky-800 mb-1">Descripción</label>
            <textarea name="descripcion" rows={4} value={form.descripcion} onChange={onChange} placeholder="Contá brevemente sobre tu negocio" className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-300" />
          </div>
        </div>

        {/* Sugerencias dinámicas */}
        <div className="rounded-2xl p-[1px] bg-gradient-to-r from-sky-200 via-cyan-200 to-emerald-200 shadow-sm">
          <div className="rounded-2xl bg-white p-4">
            <div className="text-sm font-medium text-slate-800 mb-1">Sugerencias</div>
            <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">{tips.map((t,i)=>(<li key={i}>{t}</li>))}</ul>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">Guardá los datos y luego configurá <b>Servicios</b> y <b>Horarios</b> en <b>Turnos</b>.</div>
          <div className="flex gap-2">
            <button type="button" onClick={()=>navigate("/turnos")} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Ir a Turnos</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-sky-600 to-emerald-500 px-6 py-2.5 text-white text-sm font-semibold shadow hover:brightness-110 disabled:opacity-60">{saving?"Guardando…":"Guardar"}</button>
          </div>
        </div>

        {okMsg && <div className="mt-1 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-2 ring-1 ring-emerald-200">{okMsg}</div>}
        {errMsg && <div className="mt-1 rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2 ring-1 ring-rose-200">{errMsg}{hintMsg?<div className="mt-1 text-rose-600/90 text-xs">{hintMsg}</div>:null}</div>}
      </form>
    </div>
  );
}
