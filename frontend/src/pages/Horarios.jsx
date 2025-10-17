// src/pages/Horarios.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../services/api"; // ← ajustá si tu api está en otro lado

const DIAS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

// Helpers
const pad2 = (n) => String(n).padStart(2, "0");
const toHHMM = (v) => {
  if (!v) return "";
  if (/^\d{2}:\d{2}$/.test(v)) return v;              // 09:00
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v.slice(0, 5); // 09:00:00
  const d = new Date(v);
  if (!isNaN(d)) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; // ISO
  return "";
};
const validHHMM = (v) => /^\d{2}:\d{2}$/.test(v);
const hmToMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};

export default function Horarios() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    dia_semana: 1,
    hora_desde: "09:00",
    hora_hasta: "18:00",
    intervalo_min: "", // ← OPCIONAL
  });

  const resumen = useMemo(() => {
    const porDia = new Map();
    for (const h of items) {
      const d = Number(h.dia_semana);
      porDia.set(d, (porDia.get(d) || 0) + 1);
    }
    return porDia;
  }, [items]);

  const normalize = (h) => ({
    id: h.id,
    dia_semana: h.dia_semana ?? h.dia ?? h.diaSemana ?? h.diaSemanaNumero ?? 0,
    hora_desde: toHHMM(h.hora_desde ?? h.desde ?? h.horaInicio ?? h.inicio ?? "09:00"),
    hora_hasta: toHHMM(h.hora_hasta ?? h.hasta ?? h.horaFin ?? h.fin ?? "18:00"),
    intervalo_min: h.intervalo_min ?? h.intervalo ?? h.intervaloMinutos ?? "",
    activo: h.activo ?? true,
  });

  const tryChain = async (requests) => {
    let lastErr;
    for (const fn of requests) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  };

  async function load() {
    setLoading(true);
    setErr("");
    setOk("");
    try {
      let data;
      try {
        const r = await api.get("/horarios/mis");
        data = Array.isArray(r.data) ? r.data : r.data?.items || [];
      } catch {
        const r2 = await api.get("/horarios");
        data = Array.isArray(r2.data) ? r2.data : r2.data?.items || [];
      }
      const norm = data.map(normalize).sort(
        (a, b) =>
          Number(a.dia_semana) - Number(b.dia_semana) ||
          hmToMinutes(a.hora_desde) - hmToMinutes(b.hora_desde)
      );
      setItems(norm);
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          (e?.response?.status === 401
            ? "Sesión expirada. Iniciá sesión nuevamente."
            : "No se pudieron cargar los horarios.")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]:
        name === "dia_semana"
          ? Number(value)
          : value,
    }));
  }

  // Evita solapamientos en el mismo día (excluyendo el que se edita)
  function overlaps(dia, desde, hasta, omitId = null) {
    const a1 = hmToMinutes(desde);
    const a2 = hmToMinutes(hasta);
    return items.some((h) => {
      if (Number(h.dia_semana) !== Number(dia)) return false;
      if (omitId && h.id === omitId) return false;
      const b1 = hmToMinutes(h.hora_desde);
      const b2 = hmToMinutes(h.hora_hasta);
      return a1 < b2 && b1 < a2; // solape
    });
  }

  async function createOrUpdate(e) {
    e.preventDefault();
    if (saving) return;

    setErr("");
    setOk("");

    const desde = toHHMM(form.hora_desde);
    const hasta = toHHMM(form.hora_hasta);

    if (!validHHMM(desde) || !validHHMM(hasta)) {
      setErr("Formato de hora inválido (usar HH:MM).");
      return;
    }
    if (desde >= hasta) {
      setErr("El horario 'desde' debe ser menor a 'hasta'.");
      return;
    }
    if (overlaps(form.dia_semana, desde, hasta, editing?.id || null)) {
      setErr("Ese bloque se solapa con otro del mismo día.");
      return;
    }

    const intervalo = String(form.intervalo_min || "").trim();
    const payloadBase = {
      dia_semana: Number(form.dia_semana),
      hora_desde: desde,
      hora_hasta: hasta,
      ...(intervalo ? { intervalo_min: Number(intervalo) } : {}),
      // compat:
      dia: Number(form.dia_semana),
      desde,
      hasta,
      inicio: desde,
      fin: hasta,
      ...(intervalo ? { intervalo: Number(intervalo) } : {}),
    };

    setSaving(true);
    try {
      if (editing) {
        await tryChain([
          () => api.patch(`/horarios/${editing.id}`, payloadBase),
          () => api.put(`/horarios/${editing.id}`, payloadBase),
          () => api.put(`/horarios/update/${editing.id}`, payloadBase),
        ]);
        setOk("Horario actualizado.");
      } else {
        await tryChain([
          () => api.post("/horarios", payloadBase),
          () => api.post("/horarios/", payloadBase),
        ]);
        setOk("Horario agregado.");
      }
      setEditing(null);
      setForm({
        dia_semana: 1,
        hora_desde: "09:00",
        hora_hasta: "18:00",
        intervalo_min: "",
      });
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "No se pudo guardar el horario.");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(id) {
    if (!confirm("¿Eliminar horario?")) return;
    try {
      await tryChain([
        () => api.delete(`/horarios/${id}`),
        () => api.delete(`/horarios/delete/${id}`),
      ]);
      setOk("Horario eliminado.");
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo eliminar.");
    }
  }

  function startEdit(h) {
    setEditing(h);
    setForm({
      dia_semana: Number(h.dia_semana) || 1,
      hora_desde: toHHMM(h.hora_desde) || "09:00",
      hora_hasta: toHHMM(h.hora_hasta) || "18:00",
      intervalo_min: h.intervalo_min ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-400 p-5 text-white shadow">
        <h1 className="text-2xl font-semibold">Horarios</h1>
        <p className="text-sm opacity-90">Definí días y franjas donde recibís turnos.</p>
      </div>

      {/* KPIs (cantidad por día) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {DIAS.map((d) => (
          <div key={d.value} className="rounded-2xl bg-white shadow-sm border border-slate-200 p-3">
            <div className="text-xs text-slate-500">{d.label}</div>
            <div className="text-xl font-semibold text-slate-800">
              {resumen.get(d.value) || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Mensajes */}
      {err && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3">{err}</div>}
      {ok && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3">{ok}</div>}

      {/* Form */}
      <form onSubmit={createOrUpdate} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm grid gap-4">
        <div className="grid sm:grid-cols-4 gap-3">
          <label className="block">
            <span className="text-sm text-slate-700">Día</span>
            <select
              name="dia_semana"
              value={form.dia_semana}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              {DIAS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-slate-700">Desde</span>
            <input
              name="hora_desde"
              type="time"
              value={form.hora_desde}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-700">Hasta</span>
            <input
              name="hora_hasta"
              type="time"
              value={form.hora_hasta}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-700">Intervalo (min) — opcional</span>
            <input
              name="intervalo_min"
              type="number"
              min={5}
              step={5}
              value={form.intervalo_min}
              onChange={onChange}
              placeholder="p.ej. 15"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sky-600 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Agregar horario"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm({ dia_semana: 1, hora_desde: "09:00", hora_hasta: "18:00", intervalo_min: "" });
              }}
              className="rounded-xl border border-slate-300 text-slate-700 px-4 py-2.5 text-sm font-semibold bg-white"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Lista */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 md:p-4 shadow-sm">
        {loading ? (
          <div className="p-6 text-slate-500">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-slate-500">No hay horarios aún.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((h) => {
              const dia = DIAS.find((d) => d.value === Number(h.dia_semana))?.label || h.dia_semana;
              return (
                <li key={h.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <div className="font-medium text-slate-800">{dia}</div>
                    <div className="text-xs text-slate-500">
                      {toHHMM(h.hora_desde)} – {toHHMM(h.hora_hasta)}
                      {h.intervalo_min ? <> · cada {h.intervalo_min} min</> : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(h)}
                      className="rounded-lg px-3 py-1.5 text-sm border border-slate-300 bg-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => removeItem(h.id)}
                      className="rounded-lg px-3 py-1.5 text-sm bg-rose-600 text-white"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
