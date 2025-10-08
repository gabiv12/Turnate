// src/pages/Estadisticas.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

/* =========================================
   Utils dinero/fechas
========================================= */
const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
function startOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function endOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

/* =========================================
   Pie (Donut) Chart en SVG (sin libs)
   - data: [{ label, value, color }]
   - total se calcula si no se pasa
========================================= */
function PieDonut({
  data = [],
  size = 220,
  stroke = 28,
  gap = 0,          // gap entre segmentos (en px de perímetro)
  total,            // opcional
  centerTitle = "",
  centerSubtitle = "",
}) {
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * radius;

  const sum = total ?? data.reduce((a, d) => a + (Number(d.value) || 0), 0);
  const safeData = data.filter(d => Number(d.value) > 0 && d.label);

  // Calcula offsets acumulados
  let acc = 0;
  const segments = safeData.map((d, i) => {
    const frac = (Number(d.value) || 0) / (sum || 1);
    const dash = Math.max(0, circ * frac - gap);
    const seg = {
      ...d,
      dash,
      offset: acc,
      frac,
    };
    acc += circ * frac;
    return seg;
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {/* Fondo círculo (gris claro) */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        {/* Segmentos */}
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={-(s.offset / 1)}
            transform={`rotate(-90 ${cx} ${cy})`} // inicia arriba
            strokeLinecap="butt"
          />
        ))}

        {/* Centro con métricas */}
        <g>
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="fill-slate-800"
            style={{ fontWeight: 700, fontSize: 18 }}
          >
            {centerTitle}
          </text>
          {!!centerSubtitle && (
            <text
              x={cx}
              y={cy + 16}
              textAnchor="middle"
              className="fill-slate-500"
              style={{ fontSize: 12 }}
            >
              {centerSubtitle}
            </text>
          )}
        </g>
      </svg>

      {/* Leyenda */}
      <ul className="space-y-2">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-3">
            <span
              className="inline-block h-3.5 w-3.5 rounded-sm"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <div className="min-w-[10rem]">
              <div className="text-sm font-medium text-slate-800">{s.label}</div>
              <div className="text-xs text-slate-500">
                {s.value?.toLocaleString?.("es-AR") ?? s.value} · {(s.frac * 100).toFixed(1)}%
              </div>
            </div>
          </li>
        ))}
        {segments.length === 0 && (
          <li className="text-sm text-slate-500">Sin datos para graficar.</li>
        )}
      </ul>
    </div>
  );
}

/* Paleta accesible (alto contraste + diferenciación) */
const PALETTE = [
  "#2563EB", // azul
  "#10B981", // verde
  "#F59E0B", // ámbar
  "#EF4444", // rojo
  "#8B5CF6", // violeta
  "#06B6D4", // cian
  "#84CC16", // lima
  "#EC4899", // rosa
];

/* =========================================
   Página
========================================= */
export default function Estadisticas() {
  const [desde, setDesde] = useState(startOfMonthISO());
  const [hasta, setHasta] = useState(endOfMonthISO());
  const [servicios, setServicios] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const [srv, tur] = await Promise.all([
        api.get("/servicios/mis"),
        api.get("/turnos/mis", { params: { desde, hasta } }),
      ]);
      setServicios(Array.isArray(srv.data) ? srv.data : []);
      setTurnos(Array.isArray(tur.data) ? tur.data : []);
    } catch (e) {
      setErr(e?.response?.data?.detail || "No se pudieron cargar las estadísticas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // primera carga

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta]);

  // Diccionario servicio por id
  const byId = useMemo(() => {
    const m = new Map();
    servicios.forEach((s) => m.set(Number(s.id), s));
    return m;
  }, [servicios]);

  // KPIs
  const kpis = useMemo(() => {
    const totalTurnos = turnos.length;
    const ingresos = turnos.reduce((acc, t) => {
      const s = byId.get(Number(t.servicio_id)) || t.servicio;
      return acc + (Number(s?.precio) || 0);
    }, 0);
    const avg = totalTurnos ? Math.round(ingresos / totalTurnos) : 0;
    return { totalTurnos, ingresos, avg };
  }, [turnos, byId]);

  // Agregado por servicio
  const { porIngresos, porCantidad } = useMemo(() => {
    const acc = new Map();
    for (const t of turnos) {
      const s = byId.get(Number(t.servicio_id)) || t.servicio;
      const key = s?.id || t.servicio_id || "otros";
      const precio = Number(s?.precio) || 0;
      if (!acc.has(key)) acc.set(key, { id: key, nombre: s?.nombre || "Servicio", cantidad: 0, ingresos: 0, precio });
      const item = acc.get(key);
      item.cantidad += 1;
      item.ingresos += precio;
      acc.set(key, item);
    }
    const arr = Array.from(acc.values());
    const porIngresos = [...arr].sort((a, b) => b.ingresos - a.ingresos);
    const porCantidad = [...arr].sort((a, b) => b.cantidad - a.cantidad);
    return { porIngresos, porCantidad };
  }, [turnos, byId]);

  // Series para gráficas (con colores)
  const pieIngresos = useMemo(() => {
    const total = porIngresos.reduce((a, x) => a + x.ingresos, 0);
    return porIngresos.map((x, i) => ({
      label: x.nombre,
      value: x.ingresos,
      color: PALETTE[i % PALETTE.length],
      total,
    }));
  }, [porIngresos]);

  const pieCantidad = useMemo(() => {
    const total = porCantidad.reduce((a, x) => a + x.cantidad, 0);
    return porCantidad.map((x, i) => ({
      label: x.nombre,
      value: x.cantidad,
      color: PALETTE[i % PALETTE.length],
      total,
    }));
  }, [porCantidad]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-400 p-5 text-white shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Estadísticas</h1>
            <p className="text-sm opacity-90">
              Resumen de turnos e ingresos estimados en el período seleccionado.
            </p>
          </div>

          {/* Filtro fechas */}
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-2 py-2">
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 shadow">
              <span className="text-slate-600 text-xs">Desde</span>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="text-sm text-slate-800 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 shadow">
              <span className="text-slate-600 text-xs">Hasta</span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="text-sm text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3">
          {err}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Turnos</div>
          <div className="text-2xl font-semibold text-slate-800">{kpis.totalTurnos}</div>
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Ingresos estimados</div>
          <div className="text-2xl font-semibold text-slate-800">{money.format(kpis.ingresos)}</div>
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Ticket promedio</div>
          <div className="text-2xl font-semibold text-slate-800">{money.format(kpis.avg)}</div>
        </div>
      </div>

      {/* Gráficos de torta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ingresos por servicio */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 font-semibold text-slate-800">Distribución de ingresos por servicio</div>
          <PieDonut
            data={pieIngresos}
            size={240}
            stroke={34}
            gap={0}
            centerTitle={money.format(pieIngresos?.[0]?.total || 0)}
            centerSubtitle="Total período"
          />
        </div>

        {/* Cantidad por servicio */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 font-semibold text-slate-800">Distribución de turnos por servicio</div>
          <PieDonut
            data={pieCantidad}
            size={240}
            stroke={34}
            gap={0}
            centerTitle={`${pieCantidad?.[0]?.total || 0}`}
            centerSubtitle="Turnos"
          />
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top por ingresos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 font-semibold text-slate-800">Top servicios por ingresos</div>
          {pieIngresos.length === 0 ? (
            <div className="text-sm text-slate-500">Sin datos en el período.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pieIngresos.map((r, i) => (
                <li key={i} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-semibold"
                      style={{ backgroundColor: r.color }}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-slate-800">{r.label}</div>
                      <div className="text-xs text-slate-500">
                        {((r.value / (pieIngresos[0]?.total || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {money.format(r.value)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top por cantidad */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 font-semibold text-slate-800">Top servicios por cantidad</div>
          {pieCantidad.length === 0 ? (
            <div className="text-sm text-slate-500">Sin datos en el período.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pieCantidad.map((r, i) => (
                <li key={i} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-semibold"
                      style={{ backgroundColor: r.color }}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-slate-800">{r.label}</div>
                      <div className="text-xs text-slate-500">
                        {((r.value / (pieCantidad[0]?.total || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {r.value}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Lista de turnos del período */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 font-semibold text-slate-800">Turnos en el período</div>
        {loading ? (
          <div className="text-sm text-slate-500">Cargando…</div>
        ) : turnos.length === 0 ? (
          <div className="text-sm text-slate-500">Sin turnos en el rango seleccionado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Hora</th>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Servicio</th>
                  <th className="py-2 pr-3 text-right">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {turnos
                  .slice()
                  .sort((a, b) => new Date(a.desde) - new Date(b.desde))
                  .map((t) => {
                    const d = new Date(t.desde);
                    const s = byId.get(Number(t.servicio_id)) || t.servicio;
                    return (
                      <tr key={t.id}>
                        <td className="py-2 pr-3">{d.toLocaleDateString("es-AR")}</td>
                        <td className="py-2 pr-3">{d.toTimeString().slice(0, 5)}</td>
                        <td className="py-2 pr-3">{t.cliente_nombre || "—"}</td>
                        <td className="py-2 pr-3">{s?.nombre || "Servicio"}</td>
                        <td className="py-2 pr-3 text-right">
                          {money.format(Number(s?.precio) || 0)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
