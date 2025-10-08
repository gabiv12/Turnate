// src/pages/HoursModal.jsx
import { useEffect, useMemo, useState } from "react";
import {
  listMisHorarios,
  createHorario,
  updateHorario,
  deleteHorario,
} from "../services/horarios";

const DIAS = [
  "Domingo", "Lunes", "Martes", "Miércoles",
  "Jueves", "Viernes", "Sábado",
];

function validHHMM(v) {
  return /^\d{2}:\d{2}$/.test(v);
}

export default function HoursModal({
  isOpen = true,
  open,
  onClose,
  onSaved,              // se llama tras crear/editar/borrar
}) {
  const visible = useMemo(() => (typeof isOpen === "boolean" ? isOpen : !!open), [isOpen, open]);

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [err, setErr] = useState("");

  // Formulario
  const blank = { id: null, dia_semana: 1, desde: "09:00", hasta: "13:00", activo: true };
  const [form, setForm] = useState(blank);
  const editing = form.id !== null;

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await listMisHorarios();
      setList(data || []);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Error al cargar horarios");
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

  const onEdit = (h) => {
    setForm({
      id: h.id,
      dia_semana: h.dia_semana,
      desde: h.desde?.slice(0, 5) || "09:00",
      hasta: h.hasta?.slice(0, 5) || "13:00",
      activo: h.activo ?? true,
    });
  };

  const onDelete = async (h) => {
    setErr("");
    if (!confirm(`¿Eliminar el bloque de ${DIAS[h.dia_semana]} ${h.desde}–${h.hasta}?`)) return;
    try {
      await deleteHorario(h.id);
      await load();
      onSaved && onSaved("delete", h);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "No se pudo eliminar");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!validHHMM(form.desde) || !validHHMM(form.hasta)) {
      setErr("Formato de hora inválido (usar HH:MM)");
      return;
    }
    if (form.desde >= form.hasta) {
      setErr("El horario 'desde' debe ser menor a 'hasta'.");
      return;
    }

    try {
      const payload = {
        dia_semana: Number.parseInt(form.dia_semana, 10),
        desde: form.desde,
        hasta: form.hasta,
        activo: !!form.activo,
      };
      let res;
      if (editing) {
        res = await updateHorario(form.id, payload);
      } else {
        res = await createHorario(payload);
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
          <h2 className="text-lg font-semibold">Horarios</h2>
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
                  <th className="px-3 py-2 text-left">Día</th>
                  <th className="px-3 py-2 text-left">Desde</th>
                  <th className="px-3 py-2 text-left">Hasta</th>
                  <th className="px-3 py-2 text-left">Activo</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((h) => (
                  <tr key={h.id} className="border-t">
                    <td className="px-3 py-2">{DIAS[h.dia_semana] ?? h.dia_semana}</td>
                    <td className="px-3 py-2">{h.desde?.slice(0, 5)}</td>
                    <td className="px-3 py-2">{h.hasta?.slice(0, 5)}</td>
                    <td className="px-3 py-2">{h.activo ? "Sí" : "No"}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button className="px-2 py-1 rounded bg-amber-500 text-white" onClick={() => onEdit(h)}>Editar</button>
                      <button className="px-2 py-1 rounded bg-rose-600 text-white" onClick={() => onDelete(h)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Sin horarios aún</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={onSubmit} className="grid md:grid-cols-5 gap-3 mt-4">
          <select
            className="border rounded-lg px-3 py-2"
            name="dia_semana"
            value={form.dia_semana}
            onChange={onChange}
          >
            {DIAS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>

          <input
            className="border rounded-lg px-3 py-2"
            type="time"
            name="desde"
            value={form.desde}
            onChange={onChange}
            required
          />

          <input
            className="border rounded-lg px-3 py-2"
            type="time"
            name="hasta"
            value={form.hasta}
            onChange={onChange}
            required
          />

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              name="activo"
              checked={form.activo}
              onChange={onChange}
            />
            <span>Activo</span>
          </label>

          <div className="flex gap-2 justify-end">
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
