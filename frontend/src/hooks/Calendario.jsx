// src/hooks/Calendario.jsx
import { useMemo, useState } from "react";
import { Calendar, Views, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  format,
  parse as dfParse,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getDay,
} from "date-fns";
import es from "date-fns/locale/es";

// Localizador en español con semana iniciando en lunes
const locales = { es };
const localizer = dateFnsLocalizer({
  format,
  parse: (dateString, fmt, referenceDate) =>
    dfParse(dateString, fmt, referenceDate, { locale: es }),
  startOfWeek: (d) => startOfWeek(d, { weekStartsOn: 1 }),
  getDay,
  locales,
});

const messages = {
  today: "Hoy",
  next: "Siguiente",
  previous: "Anterior",
  month: "Mes",
  week: "Semana",
  day: "Día",
  agenda: "Agenda",
  date: "Fecha",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "No hay turnos en el rango seleccionado.",
  showMore: (total) => `+${total} más`,
};

/**
 * Calendario wrapper CONTROLADO (view y date)
 *
 * Props:
 * - turnos: Array<{ start: Date|string, end: Date|string, title: string, ... }>
 * - onSelectEvent(event)
 * - onSelectSlot(slotInfo)
 * - defaultView: "month" | "week" | "day" | "agenda"
 * - defaultDate: Date (opcional, por defecto hoy)
 * - height: number (px)
 * - dayPropGetter?: (date: Date) => { className?: string; style?: React.CSSProperties; }
 * - onRangeRequest?: (start: Date, end: Date, view: string) => void
 */
export default function Calendario({
  turnos = [],
  onSelectEvent = () => {},
  onSelectSlot = () => {},
  defaultView = "month",
  defaultDate = new Date(),
  height = 720,
  dayPropGetter,
  onRangeRequest,
}) {
  // Estado controlado para que la toolbar responda siempre
  const [view, setView] = useState(defaultView);
  const [date, setDate] = useState(defaultDate);

  // Normalizamos start/end en los events
  const events = useMemo(
    () =>
      (turnos || []).map((e) => ({
        ...e,
        start: e.start instanceof Date ? e.start : new Date(e.start),
        end: e.end instanceof Date ? e.end : new Date(e.end),
      })),
    [turnos]
  );

  // Normaliza el rango visible que entrega RBC según la vista
  function normalizeRange(range, v, currentDate) {
    const viewStr = typeof v === "string" ? v : String(v || "month");
    if (Array.isArray(range) && range.length) {
      // En vista "month" RBC manda un array de fechas visibles
      const start = new Date(range[0]);
      const end = new Date(range[range.length - 1]);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (range?.start && range?.end) {
      // En "week" y "day" manda objeto
      const start = new Date(range.start);
      const end = new Date(range.end);
      end.setMilliseconds(end.getMilliseconds() - 1); // inclusivo
      return { start, end };
    }

    // Fallbacks por vista cuando no viene "range" (p.ej. al cambiar de vista)
    if (viewStr === Views.MONTH) {
      const s = startOfMonth(currentDate);
      const e = endOfMonth(currentDate);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    if (viewStr === Views.WEEK) {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = endOfWeek(currentDate, { weekStartsOn: 1 });
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    // Día / Agenda
    const s = new Date(currentDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(currentDate);
    e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }

  // Dispara el fetch cuando cambia el rango visible
  const emitRange = (rng, v, d) => {
    if (!onRangeRequest) return;
    const { start, end } = normalizeRange(rng, v, d);
    onRangeRequest(start, end, v);
  };

  // Eventos de RBC (controlados)
  const handleRangeChange = (rng, v) => {
    // RBC dispara esto en cambios de mes/semana/día y navegación
    emitRange(rng, v ?? view, date);
  };

  const handleNavigate = (newDate, v) => {
    setDate(newDate);
    emitRange(null, v ?? view, newDate);
  };

  const handleView = (v) => {
    setView(v);
    emitRange(null, v, date);
  };

  return (
    <div style={{ height }} className="w-full overflow-hidden rounded-xl">
      <Calendar
        localizer={localizer}
        culture="es"
        messages={messages}
        // CONTROLADO
        view={view}
        onView={handleView}
        date={date}
        onNavigate={handleNavigate}
        // data
        events={events}
        startAccessor="start"
        endAccessor="end"
        // opciones
        defaultView={defaultView}
        defaultDate={defaultDate}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        popup
        selectable
        onRangeChange={handleRangeChange}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        dayPropGetter={dayPropGetter}
      />
    </div>
  );
}
