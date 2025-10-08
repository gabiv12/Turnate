// src/pages/EmprendedorForm.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

const cx = (...c) => c.filter(Boolean).join(" ");

function randomCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function EmprendedorForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    rubro: "",
    descripcion: "",
    codigo_cliente: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const codeInputRef = useRef(null);

  // Cargar datos si existen
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await api.get("/emprendedores/mi");
        if (r?.data) {
          const e = r.data;
          setForm({
            nombre: e.nombre || "",
            telefono: e.telefono || "",
            direccion: e.direccion || "",
            rubro: e.rubro || "",
            descripcion: e.descripcion || "",
            codigo_cliente: e.codigo_cliente || e.codigo || "",
          });
        } else {
          // si no vuelve nada, generamos un código tentativo
          setForm((f) => ({ ...f, codigo_cliente: f.codigo_cliente || randomCode() }));
        }
      } catch {
        // si el back no tiene endpoint, default amigable
        setForm((f) => ({ ...f, codigo_cliente: f.codigo_cliente || randomCode() }));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(form.codigo_cliente || "");
      setOkMsg("¡Código copiado!");
      setTimeout(() => setOkMsg(""), 1500);
    } catch {
      setErrMsg("No se pudo copiar el código.");
      setTimeout(() => setErrMsg(""), 2000);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    // Validaciones mínimas
    if (!form.nombre?.trim()) {
      codeInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setErrMsg("Ingresá el nombre del negocio.");
      setTimeout(() => setErrMsg(""), 2200);
      return;
    }

    setSaving(true);
    setOkMsg("");
    setErrMsg("");

    // payload común
    const payload = {
      nombre: form.nombre?.trim(),
      telefono: form.telefono?.trim() || null,
      direccion: form.direccion?.trim() || null,
      rubro: form.rubro?.trim() || null,
      descripcion: form.descripcion?.trim() || null,
      codigo_cliente: (form.codigo_cliente || "").trim().toUpperCase(),
    };

    try {
      // Intentamos update; si falla, creamos; si no existe el back, guardamos en localStorage
      try {
        await api.put("/emprendedores/mi", payload);
      } catch {
        try {
          await api.post("/emprendedores", payload);
        } catch {
          // modo local de emergencia
          localStorage.setItem("turnate_emprendimiento", JSON.stringify(payload));
        }
      }

      setOkMsg("¡Emprendimiento guardado!");
      setTimeout(() => setOkMsg(""), 2500);
      // Redirigir a Turnos para seguir flujo
      // navigate("/turnos");
    } catch (err) {
      console.error(err);
      setErrMsg("No se pudo guardar.");
      setTimeout(() => setErrMsg(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-slate-500 text-sm">Cargando…</div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre comercial */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-sky-700 mb-1">Nombre comercial</label>
          <input
            name="nombre"
            type="text"
            value={form.nombre}
            onChange={onChange}
            placeholder="Ej: Estética Florencia"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-xs font-semibold text-sky-700 mb-1">Teléfono</label>
          <input
            name="telefono"
            type="tel"
            value={form.telefono}
            onChange={onChange}
            placeholder="Ej: +54 9 11 5555-5555"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-xs font-semibold text-sky-700 mb-1">Dirección</label>
          <input
            name="direccion"
            type="text"
            value={form.direccion}
            onChange={onChange}
            placeholder="Calle 123, Ciudad"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        {/* Rubro */}
        <div>
          <label className="block text-xs font-semibold text-sky-700 mb-1">Rubro</label>
          <input
            name="rubro"
            type="text"
            value={form.rubro}
            onChange={onChange}
            placeholder="Ej: Peluquería, Barbería, Estética…"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        {/* Código para clientes */}
        <div>
          <label className="block text-xs font-semibold text-sky-700 mb-1">
            Código para clientes
          </label>
          <div className="flex gap-2">
            <input
              ref={codeInputRef}
              name="codigo_cliente"
              type="text"
              value={form.codigo_cliente}
              onChange={onChange}
              placeholder="ABC123"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-sky-300 tracking-widest uppercase"
            />
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, codigo_cliente: randomCode() }))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Generar
            </button>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Copiar
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Los clientes reservan en: <b>/reservar/&lt;código&gt;</b>
          </p>
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs font-semibold text-sky-700 mb-1">Descripción</label>
        <textarea
          name="descripcion"
          rows={4}
          value={form.descripcion}
          onChange={onChange}
          placeholder="Contá brevemente sobre tu negocio"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-sky-300"
        />
      </div>

      {/* Acciones */}
      <div className="pt-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="text-xs text-slate-500">
          Guardá los datos y después configurá los <b>Servicios</b> y <b>Horarios</b>.
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/turnos")}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Ir a Turnos
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-sky-600 to-emerald-500 px-6 py-2.5 text-white text-sm font-semibold shadow hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {okMsg && (
        <div className="mt-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-2 ring-1 ring-emerald-200">
          {okMsg}
        </div>
      )}
      {errMsg && (
        <div className="mt-3 rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2 ring-1 ring-rose-200">
          {errMsg}
        </div>
      )}
    </form>
  );
}
