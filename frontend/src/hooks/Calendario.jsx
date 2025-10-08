// src/hooks/Calendario.jsx
import React, { useState, useMemo, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

// ==== Español
moment.updateLocale("es", {
  months: [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","septiembre","octubre","noviembre","diciembre",
  ],
  monthsShort: ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"],
  weekdays: ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"],
  weekdaysShort: ["dom","lun","mar","mié","jue","vie","sáb"],
  weekdaysMin:   ["do","lu","ma","mi","ju","vi","sá"],
});
moment.locale("es");
const localizer = momentLocalizer(moment);

// Diccionarios para formatos
const MESES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];
const DIAS_CORTO = ["dom","lun","mar","mié","jue","vie","sáb"];

// Helpers horario
const DAY_KEYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const hhmmToMinutes = (hhmm = "00:00") => {
  const [h, m] = String(hhmm).split(":").map((n) => parseInt(n || "0", 10));
  return h * 60 + (m || 0);
};
const dateToMinutes = (d) => d.getHours() * 60 + d.getMinutes();
const minutesToDate = (mins) => {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const d = new Date(base);
  d.setMinutes(mins);
  return d;
};
const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Sanear texto
const asText = (v) => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object") {
    if (typeof v.nombre === "string") return v.nombre;
    if (typeof v.name === "string") return v.name;
    if (typeof v.title === "string") return v.title;
  }
  return "";
};

// ==== UI de evento
function EventComponent({ event }) {
  const servicio =
    asText(event?.servicio) ||
    asText(event?.servicio_nombre) ||
    asText(event?.servicioNombre) ||
    (typeof event?.title === "string" ? event.title : "") ||
    "Turno";

  const cliente =
    asText(event?.cliente) ||
    asText(event?.cliente_nombre);

  return (
    <div
      className="rounded-md px-2 py-1 text-white ring-1 ring-white/30 shadow-sm leading-tight"
      style={{ backgroundColor: event.color || "#2563eb" }}
    >
      <div className="text-[11px] font-semibold">
        {moment(event.start).format("HH:mm")} – {moment(event.end).format("HH:mm")}
      </div>
      <div className="text-[12px] font-medium truncate">{servicio}</div>
      {cliente ? (
        <div className="text-[11px] opacity-90 truncate">{cliente}</div>
      ) : null}
    </div>
  );
}

function AgendaEvent({ event }) {
  const servicio =
    asText(event?.servicio) ||
    asText(event?.servicio_nombre) ||
    asText(event?.servicioNombre) ||
    (typeof event?.title === "string" ? event.title : "") ||
    "Turno";
  const cliente = asText(event?.cliente) || asText(event?.cliente_nombre);

  return (
    <span className="block">
      <span className="font-semibold">{servicio}</span>
      {cliente ? <span className="text-slate-500 ml-2">{cliente}</span> : null}
    </span>
  );
}

export default function Calendario({
  turnos = [],
  onSelectEvent = () => {},
  onSelectSlot = () => {},
  defaultView = "month",
  workingDayKeys = null,   // ["monday",...]
  workingHours = null,     // { monday: [{from,to}], ... }
  onDateChange = null,
  height = 720,            // ⬅️ ahora controlás el alto real
}) {
  const [view, setView] = useState(defaultView);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    onDateChange?.(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, view]);

  // Normalizar bloques horarios
  const normalizedBlocks = useMemo(() => {
    if (!workingHours) return null;
    const map = {};
    for (const day of DAY_KEYS) {
      const arr = Array.isArray(workingHours?.[day]) ? workingHours[day] : [];
      map[day] = arr
        .filter((b) => b?.from && b?.to)
        .map((b) => ({ fromMin: hhmmToMinutes(b.from), toMin: hhmmToMinutes(b.to) }))
        .filter((b) => b.fromMin < b.toMin);
    }
    return map;
  }, [workingHours]);

  // Días habilitados
  const allowedSet = useMemo(() => {
    let base = workingDayKeys;
    if ((!base || base.length === 0) && normalizedBlocks) {
      base = DAY_KEYS.filter((k) => (normalizedBlocks[k]?.length || 0) > 0);
    }
    if (!base || base.length === 0) base = DAY_KEYS;
    return new Set(base);
  }, [workingDayKeys, normalizedBlocks]);

  const isAllowedDay = (d) => allowedSet.has(DAY_KEYS[new Date(d).getDay()]);
  const isAllowedSlot = (d) => {
    if (!isAllowedDay(d)) return false;
    if (!normalizedBlocks) return true; // sin horarios cargados, permitir selección
    const key = DAY_KEYS[new Date(d).getDay()];
    const blocks = normalizedBlocks[key] || [];
    if (blocks.length === 0) return false;
    const mins = dateToMinutes(d);
    return blocks.some((b) => mins >= b.fromMin && mins < b.toMin);
  };

  // Normalizar eventos
  const events = (turnos || []).map((t) => ({
    ...t,
    start: typeof t.start === "string" ? moment.parseZone(t.start).toDate() : t.start,
    end: typeof t.end === "string" ? moment.parseZone(t.end).toDate() : t.end,
    color: t.color || (t.reservado ? "#9ca3af" : "#2563eb"),
  }));

  const eventStyleGetter = () => ({
    style: {
      color: "#fff",
      borderRadius: "0.375rem",
      padding: "0.25rem 0.5rem",
      fontSize: "0.85em",
      textAlign: "left",
    },
  });

  const messages = {
    allDay: "Todo el día",
    previous: "Ant",
    next: "Sig",
    today: "Hoy",
    month: "Mes",
    week: "Semana",
    day: "Día",
    agenda: "Agenda",
    date: "Fecha",
    time: "Hora",
    event: "Turno",
    noEventsInRange: "No hay turnos en este rango.",
    showMore: (n) => `+ Ver más (${n})`,
  };

  // Apariencia días/slots fuera de horario
  const dayPropGetter = (dateObj) => {
    if (isAllowedDay(dateObj)) return {};
    return {
      style: {
        background:
          "repeating-linear-gradient(135deg, #f1f5f9 0px, #f1f5f9 6px, #eef2ff 6px, #eef2ff 12px)",
        filter: "grayscale(0.25)",
        opacity: 0.65,
      },
    };
  };
  const slotPropGetter = (dateObj) => {
    if (isAllowedSlot(dateObj)) return {};
    return {
      style: {
        background:
          "repeating-linear-gradient(135deg, #f8fafc 0px, #f8fafc 6px, #eef2ff 6px, #eef2ff 12px)",
        opacity: 0.5,
        pointerEvents: "none",
      },
    };
  };

  // Selección: si hay horarios, validamos; si no, no bloqueamos
  const onSelecting = ({ start, end }) => {
    if (!normalizedBlocks) return true;
    const okStart = isAllowedSlot(start);
    const okEnd = end ? isAllowedSlot(end) : okStart;
    return okStart && okEnd;
  };

  // Min/Max del time-grid
  const { globalMinDate, globalMaxDate, scrollToTime } = useMemo(() => {
    if (!normalizedBlocks) {
      const min = minutesToDate(8 * 60);
      const max = minutesToDate(20 * 60);
      return { globalMinDate: min, globalMaxDate: max, scrollToTime: min };
    }
    let minM = 24 * 60, maxM = 0;
    for (const day of DAY_KEYS) {
      for (const b of (normalizedBlocks[day] || [])) {
        if (b.fromMin < minM) minM = b.fromMin;
        if (b.toMin > maxM) maxM = b.toMin;
      }
    }
    if (minM >= maxM) { minM = 8 * 60; maxM = 20 * 60; }
    const minD = minutesToDate(minM);
    const maxD = minutesToDate(maxM);
    return { globalMinDate: minD, globalMaxDate: maxD, scrollToTime: minD };
  }, [normalizedBlocks]);

  // Formatos ES
  const formats = {
    monthHeaderFormat: (d) =>
      capitalizar(`${MESES[d.getMonth()]} ${d.getFullYear()}`),
    dayHeaderFormat: (d) =>
      capitalizar(`${moment(d).format("dddd")} ${d.getDate()} de ${MESES[d.getMonth()]}`),
    dayRangeHeaderFormat: ({ start, end }) => {
      const s = `${start.getDate()} de ${MESES[start.getMonth()]} ${start.getFullYear()}`;
      const e = `${end.getDate()} de ${MESES[end.getMonth()]} ${end.getFullYear()}`;
      return `${capitalizar(s)} – ${capitalizar(e)}`;
    },
    weekdayFormat: (d) => capitalizar(DIAS_CORTO[d.getDay()]),
    dayFormat: (d) => capitalizar(`${DIAS_CORTO[d.getDay()]} ${d.getDate()}`),
    agendaHeaderFormat: ({ start, end }) => {
      const s = `${start.getDate()} de ${MESES[start.getMonth()]} ${start.getFullYear()}`;
      const e = `${end.getDate()} de ${MESES[end.getMonth()]} ${end.getFullYear()}`;
      return `${capitalizar(s)} – ${capitalizar(e)}`;
    },
    agendaDateFormat: (d) =>
      capitalizar(
        `${DIAS_CORTO[d.getDay()]} ${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`
      ),
    agendaTimeFormat: (d) => moment(d).format("HH:mm"),
    agendaTimeRangeFormat: ({ start, end }) =>
      `${moment(start).format("HH:mm")}–${moment(end).format("HH:mm")}`,
    timeGutterFormat: (d) => moment(d).format("HH:mm"),
  };

  return (
    <div
      className="w-full mx-auto font-sans relative"
      style={{ overflow: "visible" }}
    >
      <Calendar
        localizer={localizer}
        culture="es"
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={["month", "week", "day", "agenda"]}
        view={view}
        date={date}
        onView={(v) => setView(v)}
        onNavigate={(newDate) => {
          setDate(newDate);
          onDateChange?.(newDate);
        }}
        selectable
        onSelecting={onSelecting}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        longPressThreshold={250}  // mejora selección en mobile
        components={{
          event: EventComponent,
          agenda: { event: AgendaEvent },
        }}
        // Siempre texto, nunca objeto
        titleAccessor={(e) =>
          asText(e?.servicio) ||
          asText(e?.servicio_nombre) ||
          asText(e?.servicioNombre) ||
          (typeof e?.title === "string" ? e.title : "Turno")
        }
        messages={messages}
        eventPropGetter={eventStyleGetter}
        dayPropGetter={dayPropGetter}
        slotPropGetter={slotPropGetter}
        min={globalMinDate}
        max={globalMaxDate}
        scrollToTime={scrollToTime}
        formats={formats}
        popup
        style={{ height, width: "100%" }}   // ⬅️ alto real aplicado
      />
    </div>
  );
}
