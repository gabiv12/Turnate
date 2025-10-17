// src/components/CalendarBooking.jsx
import { useMemo, useState } from "react";
import { format, addMinutes, startOfDay, isBefore } from "date-fns";
import es from "date-fns/locale/es";
import PublicCalendar from "./PublicCalendar";
import { listarTurnosPublicos, reservarTurno } from "../services/turnos";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const DIAS_LARGO = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const toDateAt = (dayDate, hhmm) => {
  const [hh, mm] = String(hhmm || "00:00").split(":").map(Number);
  const d = new Date(dayDate);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
};
const overlaps = (a0, a1, b0, b1) => a0 < b1 && a1 > b0;

// Genera slots disponibles para UN día dado un servicio (duración), horarios y turnos ya reservados
function buildSlotsForDay(day, horariosPorDia, turnosPorDia, duracionMin) {
  const out = [];
  const dow = day.getDay();
  const bloques = horariosPorDia.get(dow) || [];
  for (const b of bloques) {
    const start = toDateAt(day, b.desde);
    const end   = toDateAt(day, b.hasta);
    const step  = Number(b.intervalo || 30) || 30;
    for (let t = new Date(start); addMinutes(t, duracionMin) <= end; t = addMinutes(t, step)) {
      const s0 = new Date(t);
      const s1 = addMinutes(s0, duracionMin);
      if (isBefore(s0, new Date())) continue; // no pasado
      const key = format(s0, "yyyy-MM-dd");
      const ocupados = turnosPorDia.get(key) || [];
      const choca = ocupados.some(o => overlaps(s0, s1, o.inicio, o.fin));
      if (!choca) out.push({ start: s0, end: s1 });
    }
  }
  return out;
}

export default function CalendarBooking({
  codigo,
  servicios = [],
  horarios = [],
  turnos = [],
  desdeISO,
  hastaISO,
  onAfterReserve, // (turnos) => void
}) {
  // Estados
  const [selServicioId, setSelServicioId] = useState(servicios[0]?.id ?? null);
  const servicioSel = useMemo(() => servicios.find(s => s.id === selServicioId) || null, [servicios, selServicioId]);
  const duracionMin = useMemo(() => Number(servicioSel?.duracion_min || 0) || 30, [servicioSel]);

  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [cliente, setCliente] = useState({ nombre: "", telefono: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  // Índices útiles
  const turnosPorDia = useMemo(() => {
    const map = new Map();
    for (const t of turnos) {
      const k = format(new Date(t.inicio), "yyyy-MM-dd");
      const arr = map.get(k) || [];
      arr.push({
        inicio: new Date(t.inicio),
        fin: new Date(t.fin ?? addMinutes(new Date(t.inicio), Number(t.duracion_min || 60))),
      });
      map.set(k, arr);
    }
    return map;
  }, [turnos]);

  const horariosPorDia = useMemo(() => {
    const m = new Map();
    for (let i = 0; i < 7; i++) m.set(i, []);
    for (const h of horarios) {
      const d = Number(h.dia_semana ?? 0);
      m.get(d).push({ desde: h.hora_desde, hasta: h.hora_hasta, intervalo: Number(h.intervalo_min || 30) });
    }
    for (const [, arr] of m) arr.sort((a,b) => (a.desde||"").localeCompare(b.desde||""));
    return m;
  }, [horarios]);

  // ¿El día tiene algún slot disponible para el servicio?
  const isDayEnabled = (day) => {
    if (!servicioSel) return false;
    return buildSlotsForDay(day, horariosPorDia, turnosPorDia, duracionMin).length > 0;
  };

  // Slots del día seleccionado
  const daySlots = useMemo(() => {
    if (!selectedDay || !servicioSel) return [];
    return buildSlotsForDay(selectedDay, horariosPorDia, turnosPorDia, duracionMin);
  }, [selectedDay, servicioSel, horariosPorDia, turnosPorDia, duracionMin]);

  async function confirmReserva() {
    if (!servicioSel || !selectedSlot) return;
    setSaving(true); setErrMsg(""); setOkMsg("");
    try {
      await reservarTurno({
        codigo,
        servicio_id: servicioSel.id,
        inicio: selectedSlot.start.toISOString(),
        fin: selectedSlot.end.toISOString(),
        cliente_nombre: cliente.nombre?.trim() || "Cliente",
        cliente_telefono: cliente.telefono?.trim() || null,
        cliente_email: cliente.email?.trim() || null,   // <— AHORA TAMBIÉN ENVIAMOS EMAIL
      });

      // refrescamos turnos y limpiamos selección
      const r = await listarTurnosPublicos(codigo, desdeISO, hastaISO);
      const lista = Array.isArray(r?.data) ? r.data : [];
      onAfterReserve?.(lista);

      setSelectedSlot(null);
      setOkMsg(
        cliente.email?.trim()
          ? `¡Reserva confirmada! Te enviamos un correo a ${cliente.email.trim()} (simulado).`
          : "¡Reserva confirmada!"
      );
      setTimeout(() => setOkMsg(""), 3000);
    } catch (e) {
      const s = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.response?.data?.message || e?.message;
      const msg =
        s === 409 ? "Ese horario se ocupó recién. Elegí otro, por favor."
        : s === 401 ? "Tu sesión expiró. Iniciá sesión y probá de nuevo."
        : detail || "No se pudo reservar el turno.";
      setErrMsg(msg);
      setTimeout(() => setErrMsg(""), 3500);
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="grid gap-5">
      {/* Selector de servicio */}
      <div className="w-full max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-sky-700 mb-1">Servicio</label>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-300"
            value={selServicioId || ""}
            onChange={(e)=>{ setSelServicioId(Number(e.target.value)||null); setSelectedDay(null); setSelectedSlot(null); }}
          >
            {servicios.length === 0 && <option value="">No hay servicios configurados</option>}
            {servicios.map(s=>(
              <option key={s.id} value={s.id}>
                {s.nombre} · {Number(s.duracion_min||0)} min {s.precio ? `· ${money.format(Number(s.precio||0))}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-sky-700 mb-1">Duración</label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
            {servicioSel ? (Number(servicioSel.duracion_min || 0) || 30) : "—"} min
          </div>
        </div>
      </div>

      {/* Calendario mensual */}
      <PublicCalendar
        selectedDate={selectedDay}
        onSelectDate={(d) => { setSelectedDay(startOfDay(d)); setSelectedSlot(null); }}
        isDayEnabled={isDayEnabled}
      />

      {/* Horarios del día elegido */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
        <div className="text-center mb-3">
          <div className="font-medium text-slate-800">Horarios disponibles</div>
          <div className="text-xs text-slate-500">
            Elegí un horario para continuar.
          </div>
        </div>

        {!servicioSel ? (
          <div className="text-sm text-center text-slate-500">Primero seleccioná un servicio.</div>
        ) : !selectedDay ? (
          <div className="text-sm text-center text-slate-500">Elegí un día en el calendario.</div>
        ) : daySlots.length === 0 ? (
          <div className="text-sm text-center text-slate-500">No hay turnos para este día.</div>
        ) : (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {daySlots.map((s) => (
              <button
                key={s.start.toISOString()}
                onClick={() => setSelectedSlot(s)}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm font-semibold",
                  selectedSlot && s.start.getTime() === selectedSlot.start.getTime()
                    ? "bg-blue-700 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                ].join(" ")}
              >
                {format(s.start, "HH:mm", { locale: es })}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Confirmación */}
      {selectedSlot && (
        <section className="rounded-2xl border-2 border-blue-200 bg-white p-4 md:p-5 shadow-sm">
          <div className="text-center">
            <div className="font-semibold text-slate-900">Confirmar turno</div>
            <div className="text-sm text-slate-600 mt-0.5">
              {servicioSel?.nombre} · {format(selectedSlot.start, "EEE d MMM · HH:mm", { locale: es })}
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mt-3 max-w-2xl mx-auto">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-sky-700 mb-1">Tu nombre</label>
                <input
                  value={cliente.nombre}
                  onChange={(e)=>setCliente(p=>({...p, nombre: e.target.value}))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-sky-700 mb-1">Teléfono (opcional)</label>
                <input
                  value={cliente.telefono}
                  onChange={(e)=>setCliente(p=>({...p, telefono: e.target.value}))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder="Ej: +54 9 11 ..."
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-sky-700 mb-1">Email (opcional)</label>
                <input
                  type="email"
                  value={cliente.email}
                  onChange={(e)=>setCliente(p=>({...p, email: e.target.value}))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-300"
                  placeholder="Ej: nombre@correo.com"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                onClick={()=>setSelectedSlot(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReserva}
                disabled={saving || !servicioSel}
                className="rounded-xl bg-blue-600 text-white px-5 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                type="button"
              >
                {saving ? "Reservando…" : "Confirmar reserva"}
              </button>
            </div>

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
          </div>
        </section>
      )}
    </div>
  );
}
