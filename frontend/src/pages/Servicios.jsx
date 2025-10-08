// src/pages/Servicios.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function Servicios() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({ nombre: "", duracion_min: 30, precio: 0 });
  const [editing, setEditing] = useState(null);

  const totalServicios = useMemo(() => items.length, [items]);
  const precioPromedio = useMemo(() => {
    if (!items.length) return 0;
    const s = items.reduce((acc, it) => acc + (Number(it.precio) || 0), 0);
    return Math.round(s / items.length);
  }, [items]);

  async function load() {
    try {
      setErr("");
      setOk("");
      setLoading(true);
      const { data } = await api.get("/servicios/mis");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.detail || "No se pudieron cargar los servicios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]:
        name === "precio" || name === "duracion_min"
          ? (value === "" ? "" : Number(value))
          : value,
    }));
  }

  async function createOrUpdate(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    const payload = {
      nombre: String(form.nombre || "").trim(),
      duracion_min: Number(form.duracion_min) || 0,
      precio: Number(form.precio) || 0,
    };

    if (!payload.nombre) return setErr("El nombre es obligatorio.");
    if (payload.duracion_min < 5) return setErr("La duración mínima es 5 minutos.");
    if (payload.precio < 0) return setErr("El precio no puede ser negativo.");

    try {
      if (editing) {
        await api.patch(`/servicios/${editing.id}`, payload);
        setOk("Servicio actualizado.");
      } else {
        await api.post("/servicios", payload);
        setOk("Servicio agregado.");
      }
      setForm({ nombre: "", duracion_min: 30, precio: 0 });
      setEditing(null);
      await load();
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.detail || "No se pudo guardar el servicio.");
    }
  }

  async function removeItem(id) {
    if (!confirm("¿Eliminar servicio?")) return;
    try {
      await api.delete(`/servicios/${id}`);
      setOk("Servicio eliminado.");
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "No se pudo eliminar.");
    }
  }

  function startEdit(it) {
    setEditing(it);
    setForm({
      nombre: it.nombre ?? "",
      duracion_min: Number(it.duracion_min) || 30,
      precio: Number(it.precio) || 0,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-400 p-5 text-white shadow">
        <h1 className="text-2xl font-semibold">Servicios</h1>
        <p className="text-sm opacity-90">Creá, editá y eliminá los servicios que ofrecés.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Total de servicios</div>
          <div className="text-2xl font-semibold text-slate-800">{totalServicios}</div>
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Precio promedio</div>
          <div className="text-2xl font-semibold text-slate-800">{money.format(precioPromedio)}</div>
        </div>
      </div>

      {/* Mensajes */}
      {err && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3">{err}</div>}
      {ok && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3">{ok}</div>}

      {/* Formulario */}
      <form onSubmit={createOrUpdate} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm grid gap-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-sm text-slate-700">Nombre</span>
            <input
              name="nombre"
              value={form.nombre}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Corte de pelo"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-700">Duración (min)</span>
            <input
              name="duracion_min"
              type="number"
              min={5}
              step={5}
              value={form.duracion_min}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-700">Precio (ARS)</span>
            <input
              name="precio"
              type="number"
              min={0}
              step={50}
              value={form.precio}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ej.: 5000"
              required
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="rounded-xl bg-sky-600 text-white px-4 py-2.5 text-sm font-semibold">
            {editing ? "Guardar cambios" : "Agregar servicio"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => { setEditing(null); setForm({ nombre: "", duracion_min: 30, precio: 0 }); }}
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
          <div className="p-6 text-slate-500">No hay servicios aún.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="font-medium text-slate-800">{it.nombre}</div>
                  <div className="text-xs text-slate-500">
                    Duración: {it.duracion_min} min · Precio: {money.format(Number(it.precio) || 0)}
                  </div>
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
