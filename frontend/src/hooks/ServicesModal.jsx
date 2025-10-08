// src/pages/ServicesModal.jsx
import { useEffect, useMemo, useState } from "react";
import {
  listMisServicios,
  createServicio,
  updateServicio,
  deleteServicio,
} from "../services/servicios";

// Utilidad: convierte pesos (number o string) a centavos (int)
function pesosToCentavos(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? v.replace(",", ".") : v;
  const f = Number.parseFloat(n);
  if (Number.isNaN(f)) return 0;
  return Math.round(f * 100);
}

// Utilidad: centavos (int) -> string pesos con 2 decimales
function centavosToPesosText(c) {
  if (!Number.isFinite(c)) return "0,00";
  return (c / 100).toFixed(2).replace(".", ",");
}

export default function ServicesModal({
  isOpen = true,          // si tu sistema usa "open", también funciona
  open,
  onClose,
  onSaved,                // callback cuando se crea/edita/borra
}) {
  const visible = useMemo(() => (typeof isOpen === "boolean" ? isOpen : !!open), [isOpen, open]);

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [err, setErr] = useState("");

  // Formulario
  const blank = { id: null, nombre: "", duracion_min: 30, precio: "0,00", activo: true };
  const [form, setForm] = useState(blank);
  const editing = form.id !== null;

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await listMisServicios();
      // Normalizamos precio para mostrar en pesos con coma
      setList((data || []).map(s => ({
        ...s,
        _precio_text: centavosToPesosText(s.precio ?? 0),
      })));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Error al cargar servicios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (visible) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((old) => ({ ...old, [name]: type === "checkbox" ? checked : value }));
  };

  const onEdit = (svc) => {
    setForm({
      id: svc.id,
      nombre: svc.nombre || "",
      duracion_min: svc.duracion_min ?? 30,
      precio: centavosToPesosText(svc.precio ?? 0),
      activo: svc.activo ?? true,
    });
  };

  const onDelete = async (svc) => {
    setErr("");
    if (!confirm(`¿Eliminar el servicio "${svc.nombre}"?`)) return;
    try {
      await deleteServicio(svc.id);
      await load();
      onSaved && onSaved("delete", svc);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "No se pudo eliminar");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const payload = {
        nombre: (form.nombre || "").trim(),
        duracion_min: Number.parseInt(form.duracion_min || 0, 10) || 30,
        precio: pesosToCentavos(form.precio),
        activo: !!form.activo,
      };
      let res;
      if (editing) {
        res = await updateServicio(form.id, payload);
      } else {
        res = await createServicio(payload);
      }
      setForm(blank);
      await load();
      onSaved && onSaved(editing ? "update" : "create", res);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.message || "Error al guardar");
    }
  };

  const onCancelEdit = () => setForm(blank);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Servicios</h2>
          <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>✕</button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="py-6 text-center text-slate-500">Cargando…</div>
        ) : (
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Duración (min)</th>
                  <th className="px-3 py-2 text-left">Precio ($)</th>
                  <th className="px-3 py-2 text-left">Activo</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2">{s.nombre}</td>
                    <td className="px-3 py-2">{s.duracion_min} min</td>
                    <td className="px-3 py-2">${centavosToPesosText(s.precio)}</td>
                    <td className="px-3 py-2">{s.activo ? "Sí" : "No"}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button className="px-2 py-1 rounded bg-amber-500 text-white" onClick={() => onEdit(s)}>Editar</button>
                      <button className="px-2 py-1 rounded bg-rose-600 text-white" onClick={() => onDelete(s)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Sin servicios aún</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={onSubmit} className="grid md:grid-cols-4 gap-3 mt-4">
          <input
            className="border rounded-lg px-3 py-2 md:col-span-2"
            name="nombre"
            placeholder="Nombre del servicio"
            value={form.nombre}
            onChange={onChange}
            required
          />
          <input
            className="border rounded-lg px-3 py-2"
            name="duracion_min"
            type="number"
            min={5}
            step={5}
            placeholder="Duración (min)"
            value={form.duracion_min}
            onChange={onChange}
            required
          />
          <input
            className="border rounded-lg px-3 py-2"
            name="precio"
            placeholder="Precio en pesos (ej: 3500,00)"
            value={form.precio}
            onChange={onChange}
          />
          <label className="inline-flex items-center gap-2 md:col-span-3">
            <input
              type="checkbox"
              name="activo"
              checked={form.activo}
              onChange={onChange}
            />
            <span>Activo</span>
          </label>
          <div className="md:col-span-1 flex gap-2 justify-end">
            {editing && (
              <button type="button" onClick={onCancelEdit} className="px-3 py-2 rounded-lg border">
                Cancelar
              </button>
            )}
            <button type="submit" className="px-3 py-2 rounded-lg bg-blue-600 text-white">
              {editing ? "Actualizar" : "Agregar"}
            </button>
          </div>
        </form>

        {err && <div className="mt-3 text-sm text-rose-600">{err}</div>}
      </div>
    </div>
  );
}
