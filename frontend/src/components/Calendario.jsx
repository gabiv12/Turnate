// src/components/Calendario.jsx
import { useMemo, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import {
  format as dfFormat,
  parse as dfParse,
  startOfWeek as dfStartOfWeek,
  getDay as dfGetDay,
} from "date-fns";
import es from "date-fns/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Localizer con date-fns + español
const locales = { es };
const localizer = dateFnsLocalizer({
  format: (date, fmt, options) => dfFormat(date, fmt, { ...options, locale: es }),
  parse: (value, fmt, baseDate, options) =>
    dfParse(value, fmt, baseDate, { ...options, locale: es }),
  startOfWeek: (date, options) => dfStartOfWeek(date, { ...options, locale: es }),
  getDay: dfGetDay,
  locales,
});

// Traducciones
const messagesES = {
  date: "Fecha",
  time: "Hora",
  event: "Turno",
  allDay: "Todo el día",
  week: "Semana",
  work_week: "Laboral",
  day: "Día",
  month: "Mes",
  previous: "Anterior",
  next: "Siguiente",
  yesterday: "Ayer",
  tomorrow: "Mañana",
  today: "Hoy",
  agenda: "Agenda",
  noEventsInRange: "No hay turnos en este rango.",
  showMore: (total) => `+ Ver ${total} más`,
};

export default function Calendario({
  // datos
  turnos = [], // [{title, start: Date, end: Date, ...}]
  // callbacks (opcionales)
  onSelectEvent,
  onSelectSlot,
  onRangeChange,
  onNavigate, // opcional: el padre puede escuchar navegación
  onView,     // opcional: el padre puede escuchar cambio de vista
  // opciones visuales
  defaultView = "month",
  initialDate, // opcional: fecha inicial distinta de hoy
  height = 700,
  eventPropGetter,
  dayPropGetter,
}) {
  // --- CONTROL EXPLÍCITO DE FECHA Y VISTA (fix toolbar) ---
  const [currentDate, setCurrentDate] = useState(() => initialDate ? new Date(initialDate) : new Date());
  const [view, setView] = useState(() => {
    const v = String(defaultView || "month").toLowerCase();
    return ["month", "week", "day", "agenda"].includes(v) ? v : "month";
  });

  const handleNavigate = useCallback(
    (newDate, newView) => {
      setCurrentDate(new Date(newDate));
      // avisar al padre si lo necesita
      onNavigate?.(newDate, newView || view);
    },
    [onNavigate, view]
  );

  const handleView = useCallback(
    (newView) => {
      const v = String(newView || "month").toLowerCase();
      setView(v);
      onView?.(v);
    },
    [onView]
  );

  const handleRangeChange = useCallback(
    (range, newView) => {
      onRangeChange?.(range, newView || view);
    },
    [onRangeChange, view]
  );

  // Aseguramos Date válidas
  const events = useMemo(() => {
    return (turnos || [])
      .map((e) => ({
        ...e,
        start: e.start instanceof Date ? e.start : new Date(e.start),
        end: e.end instanceof Date ? e.end : new Date(e.end),
      }))
      .filter((e) => !isNaN(+e.start) && !isNaN(+e.end));
  }, [turnos]);

  return (
    <div className="w-full" style={{ height }}>
      <Calendar
        localizer={localizer}
        culture="es"
        messages={messagesES}
        // CONTROLADOS: si el padre re-renderiza, el calendario mantiene su estado
        date={currentDate}
        onNavigate={handleNavigate}
        view={view}
        onView={handleView}
        // Vistas habilitadas
        defaultView={defaultView}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        // Datos
        events={events}
        startAccessor="start"
        endAccessor="end"
        // Interacción
        popup
        selectable
        longPressThreshold={220}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        onRangeChange={handleRangeChange}
        // Estilos por evento / día (si los pasás)
        eventPropGetter={eventPropGetter}
        dayPropGetter={dayPropGetter}
        // Agenda / grilla
        step={30}
        timeslots={2}
        // Formatos
        formats={{
          timeGutterFormat: (date) => dfFormat(date, "HH:mm", { locale: es }),
          eventTimeRangeFormat: ({ start, end }) =>
            `${dfFormat(start, "HH:mm", { locale: es })} – ${dfFormat(end, "HH:mm", { locale: es })}`,
        }}
        // Importante: mantener la toolbar activa
        toolbar
      />
    </div>
  );
}
