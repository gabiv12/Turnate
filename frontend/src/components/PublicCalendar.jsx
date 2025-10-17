// src/components/PublicCalendar.jsx
import { useMemo, useState } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isBefore, format
} from "date-fns";
import es from "date-fns/locale/es";

export default function PublicCalendar({
  selectedDate,
  onSelectDate,
  isDayEnabled = () => true, // (date) => boolean
  initialMonth = new Date(),
  monthsAhead = 2, // cuántos meses navegar (además del actual)
}) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialMonth));
  const minDate = useMemo(() => startOfMonth(new Date()), []);
  const maxDate = useMemo(() => endOfMonth(addMonths(new Date(), monthsAhead)), [monthsAhead]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { locale: es });
  const gridEnd = endOfWeek(monthEnd, { locale: es });

  const weeks = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)));
  }

  const canPrev = isBefore(minDate, monthStart);
  const canNext = isBefore(monthStart, maxDate);

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Header calendario */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          ←
        </button>
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-900">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </div>
          <div className="text-xs text-slate-500">Elegí un día</div>
        </div>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          →
        </button>
      </div>

      {/* Nombres de días */}
      <div className="mt-3 grid grid-cols-7 text-center text-xs text-slate-500">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="py-1">{d}</div>
        ))}
      </div>

      {/* Celdas */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="contents">
            {week.map((day, di) => {
              const inMonth = isSameMonth(day, monthStart);
              const past = isBefore(day, startOfWeek(new Date(), { locale: es })) && !isSameDay(day, new Date());
              const enabled = inMonth && !past && isDayEnabled(day);
              const selected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={di}
                  type="button"
                  onClick={() => enabled && onSelectDate?.(day)}
                  className={[
                    "aspect-square rounded-xl text-sm font-medium",
                    "flex items-center justify-center",
                    enabled
                      ? (selected
                          ? "bg-blue-600 text-white"
                          : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-800")
                      : "bg-slate-100 text-slate-400",
                    !inMonth ? "opacity-60" : ""
                  ].join(" ")}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
