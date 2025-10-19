// src/pages/Estadisticas.jsx
import { useEffect, useMemo, useState, memo } from "react";
import api from "../services/api";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import es from "date-fns/locale/es";

const PALETTE = [
  "#2563eb", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#9333ea",
  "#14b8a6", "#f97316", "#84cc16", "#8b5cf6", "#06b6d4", "#dc2626",
];

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function toISODate(d) {
  if (!d) return null;
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}

const TIPS = [
  "Los gráficos por servicio usan solo turnos confirmados del período.",
  "El ticket promedio = ingresos confirmados / cantidad de confirmados.",
  "Usá el filtro de fechas para comparar períodos (mes a mes).",
  "La tabla puede incluir cancelados si activás el switch.",
];

export default function Estadisticas() {
  // Rango por defecto: mes actual
  const now = new Date();
  const defaultDesde = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultHasta = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [desde, setDesde] = useState(toISODate(defaultDesde));
  const [hasta, setHasta] = useState(toISODate(defaultHasta));

  const [servicios, setServicios] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // TIPS (rotan cada 6s sin tocar los datos de gráficos)
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  async function loadData() {
    setLoading(true);
    setErrMsg("");
    try {
      const [servRes, turRes] = await Promise.all([
        api.get("/servicios/mis"),
        api.get("/turnos/owner", {
          params: {
            desde: new Date(`${desde}T00:00:00.000Z`).toISOString(),
            hasta: new Date(`${hasta}T23:59:59.999Z`).toISOString(),
          },
        }),
      ]);
      setServicios(Array.isArray(servRes.data) ? servRes.data : []);
      setTurnos(Array.isArray(turRes.data) ? turRes.data : []);
    } catch (e) {
      console.error("Estadísticas: error cargando datos", e);
      setServicios([]);
      setTurnos([]);
      const msg = e?.response?.data?.detail || "No se pudieron cargar los datos.";
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApplyRange = () => loadData();

  // Map de servicios
  const serviciosMap = useMemo(() => {
    const m = new Map();
    servicios.forEach((s) => m.set(Number(s.id), s));
    return m;
  }, [servicios]);

  // Precio usado en estadísticas (confirmados)
  const precioTurno = (t) => {
    const p = t?.precio_aplicado;
    if (typeof p === "number" && p > 0) return p;
    const s = serviciosMap.get(Number(t.servicio_id));
    return s?.precio ?? 0;
  };

  // Separación por estado
  const confirmados = useMemo(
    () => turnos.filter((t) => (t.estado || "confirmado") === "confirmado"),
    [turnos]
  );
  const cancelados = useMemo(
    () => turnos.filter((t) => (t.estado || "") === "cancelado"),
    [turnos]
  );

  // KPIs
  const ingresosTotales = useMemo(
    () => confirmados.reduce((acc, t) => acc + precioTurno(t), 0),
    [confirmados, serviciosMap]
  );
  const ticketPromedio = useMemo(() => {
    const c = confirmados.length || 1;
    return Math.round(ingresosTotales / c);
  }, [ingresosTotales, confirmados.length]);

  // Agregados por servicio (para cantidad e ingresos)
  const agregadosServicio = useMemo(() => {
    const map = new Map(); // sid -> {count, amount, nombre}
    confirmados.forEach((t) => {
      const sid = Number(t.servicio_id) || 0;
      const svc = serviciosMap.get(sid);
      const ref = map.get(sid) || { count: 0, amount: 0, nombre: svc?.nombre || "Servicio" };
      ref.count += 1;
      ref.amount += precioTurno(t);
      map.set(sid, ref);
    });
    const arr = [...map.entries()].map(([sid, v]) => ({ servicio_id: sid, ...v }));
    arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [confirmados, serviciosMap]);

  // Mapeo de color por servicio (consistente entre tortas)
  const colorByServicio = useMemo(() => {
    const m = new Map();
    agregadosServicio.forEach((item, i) => {
      m.set(item.servicio_id, PALETTE[i % PALETTE.length]);
    });
    return m;
  }, [agregadosServicio]);

  // Tortas (memoizadas para evitar parpadeos)
  const pieCantidad = useMemo(
    () =>
      agregadosServicio.map((x) => ({
        name: x.nombre,
        value: x.count,
        color: colorByServicio.get(x.servicio_id),
      })),
    [agregadosServicio, colorByServicio]
  );

  const pieIngresos = useMemo(
    () =>
      agregadosServicio.map((x) => ({
        name: x.nombre,
        value: x.amount,
        color: colorByServicio.get(x.servicio_id),
      })),
    [agregadosServicio, colorByServicio]
  );

  const pieEstados = useMemo(
    () => [
      { name: "Confirmados", value: confirmados.length, color: "#16a34a" }, // green-600
      { name: "Cancelados", value: cancelados.length, color: "#94a3b8" }, // slate-400
    ],
    [confirmados.length, cancelados.length]
  );

  // Tabla (paginada) + opción incluir cancelados
  const baseTabla = useMemo(
    () => (includeCancelled ? turnos : confirmados),
    [includeCancelled, turnos, confirmados]
  );
  const tablaOrdenada = useMemo(
    () => [...baseTabla].sort((a, b) => new Date(a.inicio) - new Date(b.inicio)),
    [baseTabla]
  );
  const tablaTurnos = useMemo(
    () =>
      tablaOrdenada.map((t) => {
        const d = new Date(t.inicio || t.desde || t.datetime);
        const svc = serviciosMap.get(Number(t.servicio_id));
        return {
          id: t.id,
          fecha: isNaN(d) ? "—" : format(d, "dd/MM/yyyy", { locale: es }),
          hora: isNaN(d) ? "—" : format(d, "HH:mm"),
          cliente: t.cliente_nombre || t?.cliente?.nombre || "—",
          servicio: svc?.nombre || "Servicio",
          precio: precioTurno(t),
          estado: t.estado || "confirmado",
        };
      }),
    [tablaOrdenada, serviciosMap]
  );

  // Paginación de la tabla
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  useEffect(() => { setPage(1); }, [desde, hasta, includeCancelled]); // reset al cambiar filtros

  const totalItems = tablaTurnos.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return tablaTurnos.slice(start, start + perPage);
  }, [tablaTurnos, page, perPage]);

  const totalConfirmados = confirmados.length || 1;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Encabezado */}
      <header className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-400 p-5 md:p-6 text-white shadow mx-4 mt-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Estadísticas</h1>
              <p className="text-sm md:text-base/relaxed opacity-90">
                Desempeño, distribución por servicio e ingresos del período.
              </p>
            </div>
            
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
        {/* Mensaje de error (si lo hay) */}
        {errMsg && (
          <div className="rounded-xl bg-rose-50 text-rose-700 ring-1 ring-rose-200 px-4 py-2 text-sm">
            {errMsg}
          </div>
        )}

        {/* Filtros */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">Desde</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">Hasta</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={onApplyRange}
                disabled={loading}
                className="rounded-xl bg-sky-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-sky-700 disabled:opacity-60"
              >
                {loading ? "Cargando..." : "Aplicar"}
              </button>
              <label className="flex items-center gap-2 text-sm text-slate-700 ml-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={includeCancelled}
                  onChange={(e) => setIncludeCancelled(e.target.checked)}
                />
                Incluir cancelados (tabla)
              </label>
            </div>
            
          </div><div className="bg-white/10 rounded-xl px-3 py-2 text-sm">
              <span className="opacity-80">Tip: </span>
              <span className="font-medium">{TIPS[tipIndex]}</span>
            </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI title="Ingresos totales" value={currency.format(ingresosTotales)} />
          <KPI title="Confirmados" value={confirmados.length} />
          <KPI title="Cancelados" value={cancelados.length} />
          <KPI title="Ticket promedio" value={currency.format(ticketPromedio)} />
        </section>

        {/* Gráficos de torta + leyenda externa */}
        <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card title="Cantidad por servicio" subtitle={`${confirmados.length} turnos`}>
            <Donut data={pieCantidad} />
          </Card>

          <Card title="Ingresos por servicio" subtitle={currency.format(ingresosTotales)}>
            <Donut data={pieIngresos} />
          </Card>

          <Card title="Estados de turnos" subtitle={`${confirmados.length + cancelados.length} totales`}>
            <Donut data={pieEstados} />
          </Card>

          {/* Leyenda de servicios (tarjetitas) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              Servicios
            </h3>
            {pieCantidad.length === 0 ? (
              <p className="text-sm text-slate-500">Sin datos en el período.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-1 gap-2">
                {agregadosServicio.map((s, idx) => {
                  const pct = Math.round((s.count / (totalConfirmados || 1)) * 100);
                  return (
                    <li
                      key={s.servicio_id + "-" + idx}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                          style={{ background: PALETTE[idx % PALETTE.length] }}
                        />
                        <span className="text-sm text-slate-800 break-words">
                          {s.nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 pl-3">
                        <span className="text-xs text-slate-500">{pct}%</span>
                        <span className="text-xs font-medium text-slate-700">
                          {s.count}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Historial (tabla paginada) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-slate-900">
              Historial del período
            </h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Por página</label>
              <select
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              >
                {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Hora</th>
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Servicio</th>
                  <th className="py-2 pr-4">Precio</th>
                  <th className="py-2 pr-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-500">
                      Sin turnos en el período seleccionado.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-4 text-slate-800">{r.fecha}</td>
                      <td className="py-2 pr-4 text-slate-800">{r.hora}</td>
                      <td className="py-2 pr-4 text-slate-800">{r.cliente}</td>
                      <td className="py-2 pr-4 text-slate-800">{r.servicio}</td>
                      <td className="py-2 pr-4 text-slate-800">
                        {r.estado === "cancelado" ? "—" : currency.format(r.precio || 0)}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            r.estado === "cancelado"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-green-100 text-green-700",
                          ].join(" ")}
                        >
                          {r.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Mostrando {paginatedRows.length} de {totalItems}
            </div>
            <div className="flex items-center gap-1">
              <button
                className="btn-plain"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span className="px-2 text-sm">Página {page} / {totalPages}</span>
              <button
                className="btn-plain"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ---------- UI Helpers ----------
function Card({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </div>
      <div className="w-full h-72 md:h-80">
        {children}
      </div>
    </div>
  );
}

// Donut SIN parpadeo: memo + animación off por defecto
const Donut = memo(function Donut({ data, animate = false }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          labelLine={false}
          isAnimationActive={animate}
          animationDuration={300}
          label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}
        >
          {data.map((entry, idx) => (
            <Cell key={`slice-${idx}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v, n) => [typeof v === "number" ? v : 0, n]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
});

function KPI({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
