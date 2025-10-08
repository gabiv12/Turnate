// src/pages/Horarios.jsx
import { useEffect, useState } from "react";
import api from "../services/api";

const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

export default function Horarios() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({ dia: "Lunes", desde: "09:00", hasta: "18:00" });
  const [editing, setEditing] = useState(null);

  async function load() {
    try {
      setErr(""); setOk("");
      setLoading(true);
      const { data } = await api.get("/horarios/mis");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.detail || "No se pudieron cargar los horarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function createOrUpdate(e) {
    e.preventDefault();
    setErr(""); setOk("");
    try {
      if (editing) {
        await api.patch(`/horarios/${editing.id}`, form);
        setOk("Horario actualizado.");
      } else {
        await api.post("/horarios", form);
        setOk("Horario agregado.");
      }
      setForm({ dia: "Lunes", desde: "09:00", hasta: "18:00" });
      setEditing(null);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "No se pudo guardar el horario.");
    }
  }

  async function removeItem(id) {
    if (!confirm("¿Eliminar horario?")) return;
    try {
      await api.delete(`/horarios/${id}`);
      setOk("Horario eliminado.");
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo eliminar.");
    }
  }

  function startEdit(it) {
    setEditing(it);
    setForm({ dia: it.dia, desde: it.desde, hasta: it.hasta });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-400 p-5 text-white shadow">
        <h1 className="text-2xl font-semibold">Horarios</h1>
        <p className="text-sm opacity-90">Definí tus días y horas de atención.</p>
      </div>

      {err && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3">{err}</div>}
      {ok && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3">{ok}</div>}

      {/* Formulario */}
      <form onSubmit={createOrUpdate} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm grid gap-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-sm text-slate-700">Día</span>
            <select
              name="dia"
              value={form.dia}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-slate-700">Desde</span>
            <input
              name="desde"
              type="time"
              value={form.desde}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-700">Hasta</span>
            <input
              name="hasta"
              type="time"
              value={form.hasta}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="rounded-xl bg-sky-600 text-white px-4 py-2.5 text-sm font-semibold">
            {editing ? "Guardar cambios" : "Agregar horario"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => { setEditing(null); setForm({ dia: "Lunes", desde: "09:00", hasta: "18:00" }); }}
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
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="font-medium text-slate-800">{it.dia}</div>
                  <div className="text-xs text-slate-500">{it.desde} — {it.hasta}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(it)} className="rounded-lg px-3 py-1.5 text-sm border border-slate-300 bg-white">
                    Editar
                  </button>
                  <button onClick={() => removeItem(it.id)} className="rounded-lg px-3 py-1.5 text-sm bg-rose-600 text-white">
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
