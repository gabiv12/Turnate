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

// --- Helpers ---
function pad2(n){ return String(n).padStart(2, "0"); }

function toHHMM(v) {
  if (!v) return "";
  // "09:00"
  if (/^\d{2}:\d{2}$/.test(v)) return v;
  // "09:00:00"
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v.slice(0,5);
  // ISO
  const d = new Date(v);
  if (!isNaN(d)) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return "";
}

function validHHMM(v) {
  return /^\d{2}:\d{2}$/.test(v);
}

function hmToMinutes(hhmm) {
  const [h,m] = hhmm.split(":").map(Number);
  return h*60 + m;
}

export default function HoursModal({
  isOpen = true,
  open,
  onClose,
  onSaved, // callback tras crear/editar/borrar
}) {
  const visible = useMemo(() => (typeof isOpen === "boolean" ? isOpen : !!open), [isOpen, open]);

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [err, setErr] = useState("");

  // Formulario
  const blank = { id: null, dia_semana: 1, desde: "09:00", hasta: "13:00", activo: true, intervalo_min: "" };
  const [form, setForm] = useState(blank);
  const editing = form.id !== null;

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await listMisHorarios();
      // Normalizo y ordeno por día y hora
      const norm = (data || []).map(h => ({
        ...h,
        dia_semana: Number(h.dia_semana ?? h.dia ?? 1),
        desde: toHHMM(h.desde ?? h.inicio),
        hasta: toHHMM(h.hasta ?? h.fin),
        activo: h.activo ?? true,
        intervalo_min: h.intervalo_min ?? h.intervalo ?? "",
      })).sort((a,b) => (a.dia_semana - b.dia_semana) || (hmToMinutes(a.desde) - hmToMinutes(b.desde)));
      setList(norm);
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
    setErr("");
    setForm({
      id: h.id,
      dia_semana: Number(h.dia_semana),
      desde: toHHMM(h.desde),
      hasta: toHHMM(h.hasta),
      activo: !!h.activo,
      intervalo_min: h.intervalo_min ?? "",
    });
  };

  const onDelete = async (h) => {
    setErr("");
    if (!confirm(`¿Eliminar el bloque de ${DIAS[h.dia_semana]} ${toHHMM(h.desde)}–${toHHMM(h.hasta)}?`)) return;
    try {
      await deleteHorario(h.id);
      await load();
      onSaved && onSaved("delete", h);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "No se pudo eliminar");
    }
  };

  // Evitar solapamientos dentro del mismo día
  function overlaps(dia, desde, hasta, omitId = null) {
    const a1 = hmToMinutes(desde);
    const a2 = hmToMinutes(hasta);
    return list.some(h => {
      if (Number(h.dia_semana) !== Number(dia)) return false;
      if (omitId && h.id === omitId) return false;
      const b1 = hmToMinutes(toHHMM(h.desde));
      const b2 = hmToMinutes(toHHMM(h.hasta));
      // [a1,a2) solapa [b1,b2)?
      return a1 < b2 && b1 < a2;
    });
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    const desde = toHHMM(form.desde);
    const hasta = toHHMM(form.hasta);

    if (!validHHMM(desde) || !validHHMM(hasta)) {
      setErr("Formato de hora inválido (usar HH:MM)");
      return;
    }
    if (desde >= hasta) {
      setErr("El horario 'desde' debe ser menor a 'hasta'.");
      return;
    }
    if (overlaps(form.dia_semana, desde, hasta, editing ? form.id : null)) {
      setErr("Ese bloque se solapa con otro del mismo día.");
      return;
    }

    try {
      const payloadBase = {
        dia_semana: Number.parseInt(form.dia_semana, 10),
        desde,
        hasta,
        activo: !!form.activo,
      };
      // Compatibilidad: algunos back esperan inicio/fin
      const payloadCompat = {
        ...payloadBase,
        inicio: desde,
        fin: hasta,
      };
      // Intervalo opcional
      const intervalo = String(form.intervalo_min || "").trim();
      const payload = intervalo ? { ...payloadCompat, intervalo_min: Number(intervalo) } : payloadCompat;

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

  const onCancelEdit = () => { setErr(""); setForm(blank); };

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
                  <th className="px-3 py-2 text-left">Intervalo</th>
                  <th className="px-3 py-2 text-left">Activo</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((h) => (
                  <tr key={h.id} className="border-t">
                    <td className="px-3 py-2">{DIAS[h.dia_semana] ?? h.dia_semana}</td>
                    <td className="px-3 py-2">{toHHMM(h.desde)}</td>
                    <td className="px-3 py-2">{toHHMM(h.hasta)}</td>
                    <td className="px-3 py-2">{h.intervalo_min ? `${h.intervalo_min} min` : "—"}</td>
                    <td className="px-3 py-2">{h.activo ? "Sí" : "No"}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button className="px-2 py-1 rounded bg-amber-500 text-white" onClick={() => onEdit(h)}>Editar</button>
                      <button className="px-2 py-1 rounded bg-rose-600 text-white" onClick={() => onDelete(h)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">Sin horarios aún</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={onSubmit} className="grid md:grid-cols-6 gap-3 mt-4">
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

          {/* Intervalo opcional */}
          <select
            className="border rounded-lg px-3 py-2"
            name="intervalo_min"
            value={form.intervalo_min}
            onChange={onChange}
            title="Intervalo de atención (opcional)"
          >
            <option value="">Sin intervalo</option>
            <option value="10">10 min</option>
            <option value="15">15 min</option>
            <option value="20">20 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
          </select>

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
