// src/pages/Turnos.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format, startOfDay, endOfDay } from "date-fns";
import es from "date-fns/locale/es";
import Calendario from "../hooks/Calendario";
import { api } from "../services/api";
import { AnimatePresence, motion } from "framer-motion";

const cx = (...c) => c.filter(Boolean).join(" ");

/* =========================================================
   SUGERENCIAS (ticker)
   ========================================================= */
function SugerenciasTicker({ items = [], intervalMs = 4200 }) {
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setFlash(true);
      setTimeout(() => setFlash(false), 220);
      setIdx((i) => (i + 1) % (items.length || 1));
    }, intervalMs);
    return () => clearInterval(timer.current);
  }, [intervalMs, items.length]);

  if (!items?.length) return null;

  return (
    <div className="select-none">
      <div
        className={cx(
          "min-h-[26px] text-slate-800 text-sm leading-6 transition",
          flash && "animate-pulse"
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            {items[idx]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-2 flex gap-1" aria-hidden="true">
        {items.map((_, i) => (
          <span
            key={i}
            className={cx(
              "h-1.5 w-1.5 rounded-full",
              i === idx ? "bg-sky-500" : "bg-slate-300"
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   MODAL BASE
   ========================================================= */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-slate-800 font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FORMULARIO DE TURNO (CRUD)
   ========================================================= */
function TurnoForm({ initial, servicios = [], onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(() => {
    const f = initial || {};
    const fechaISO =
      typeof f.fecha === "string"
        ? f.fecha
        : f.fecha instanceof Date
        ? f.fecha.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    const hora =
      typeof f.hora === "string"
        ? f.hora
        : f.fecha instanceof Date
        ? format(f.fecha, "HH:mm")
        : "";

    return {
      servicio_id: f.servicio_id ? String(f.servicio_id) : "",
      fecha: fechaISO,
      hora: hora,
      cliente_nombre: f.cliente_nombre || "",
      notas: f.notas || "",
    };
  });

  const [err, setErr] = useState({});

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErr((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.servicio_id) e.servicio_id = "Elegí un servicio";
    if (!form.fecha) e.fecha = "Elegí una fecha";
    if (!form.hora) e.hora = "Elegí una hora";
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const [h, m] = form.hora.split(":");
    const dt = new Date(form.fecha);
    dt.setHours(Number(h), Number(m), 0, 0);
    onSubmit?.({
      servicio_id: Number(form.servicio_id),
      datetime: dt.toISOString(),
      cliente_nombre: form.cliente_nombre.trim(),
      notas: form.notas?.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="block text-sm font-medium text-slate-700">Servicio</span>
        <select
          className={cx(
            "mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm",
            err.servicio_id ? "border-rose-400" : "border-slate-300"
          )}
          value={form.servicio_id}
          name="servicio_id"
          onChange={onChange}
        >
          <option value="">Elegí…</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre} · {s.duracion_min} min
            </option>
          ))}
        </select>
        {!!err.servicio_id && (
          <div className="text-xs text-rose-600 mt-1">{err.servicio_id}</div>
        )}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700">Fecha</span>
          <input
            type="date"
            name="fecha"
            className={cx(
              "mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm",
              err.fecha ? "border-rose-400" : "border-slate-300"
            )}
            value={form.fecha}
            onChange={onChange}
          />
          {!!err.fecha && (
            <div className="text-xs text-rose-600 mt-1">{err.fecha}</div>
          )}
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-slate-700">Hora</span>
          <input
            type="time"
            name="hora"
            className={cx(
              "mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm",
              err.hora ? "border-rose-400" : "border-slate-300"
            )}
            value={form.hora}
            onChange={onChange}
          />
          {!!err.hora && (
            <div className="text-xs text-rose-600 mt-1">{err.hora}</div>
          )}
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-slate-700">Cliente</span>
        <input
          type="text"
          name="cliente_nombre"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={form.cliente_nombre}
          onChange={onChange}
          placeholder="Nombre del cliente"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-slate-700">Sugerencias / Notas</span>
        <textarea
          name="notas"
          rows={2}
          className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-sky-300 outline-none"
          value={form.notas}
          onChange={onChange}
          placeholder="Recordatorios, preferencias, etc."
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-sky-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
        >
          Guardar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="rounded-xl border border-slate-300 bg-white text-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
        >
          Cerrar
        </button>
      </div>
    </form>
  );
}

/* =========================================================
   PÁGINA TURNOS
   ========================================================= */
export default function Turnos() {
  const [servicios, setServicios] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [openNew, setOpenNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const sugerencias = [
    "Para agregar turnos, primero cargá tus Servicios y definí tus Horarios.",
    "Hacé clic en un turno para habilitar Editar / Cancelar.",
    "Agregá notas en el turno para detalles del cliente.",
    "Usá servicios con distinta duración para optimizar tu agenda.",
    "Arrastrá en Semana/Día para crear un turno rápido (si lo soporta tu calendario).",
    "Revisá los próximos 7 días para anticiparte a picos.",
    "Confirmá asistencia desde el detalle del turno.",
    "Bloqueá feriados en Horarios para evitar reservas.",
  ];

  // Carga inicial
  useEffect(() => {
    (async () => {
      try {
        const rs = await api.get("/servicios/mis");
        setServicios(rs.data || []);
      } catch {}
      try {
        const now = new Date();
        const desde = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).toISOString();
        const hasta = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)).toISOString();
        const rt = await api.get(`/turnos/mis`, { params: { desde, hasta } });

        const mapped = (rt.data || []).map((t) => {
          const dur =
            t?.servicio?.duracion_min ||
            servicios.find((s) => s.id === Number(t.servicio_id))?.duracion_min ||
            30;
        return {
            id: t.id,
            title: `${t.cliente_nombre || t.cliente?.nombre || "—"} · ${t.servicio?.nombre || t.titulo || "Servicio"}`,
            start: new Date(t.desde || t.datetime || t.inicio),
            end: t.hasta || t.fin
              ? new Date(t.hasta || t.fin)
              : new Date(new Date(t.desde || t.datetime).getTime() + dur * 60000),
            servicio: t.servicio?.nombre,
            cliente_nombre: t.cliente?.nombre || t.cliente_nombre || "—",
            notas: t.notas,
            servicio_id: t.servicio_id,
          };
        });

        setEventos(mapped);
      } catch {}
    })();
  }, []);

  const agendaDeHoy = useMemo(
    () =>
      eventos
        .filter((e) => {
          const d = new Date();
          return (
            e.start.getFullYear() === d.getFullYear() &&
            e.start.getMonth() === d.getMonth() &&
            e.start.getDate() === d.getDate()
          );
        })
        .sort((a, b) => a.start - b.start),
    [eventos]
  );

  const onSelectEvent = (evt) => setSelected(evt);
  const onSelectSlot = () => {
    setSelected(null);
    setOpenNew(true);
  };

  const crearTurno = async (payload) => {
    try {
      setLoading(true);
      const res = await api.post("/turnos", payload);
      const t = res.data;
      const dur =
        t?.servicio?.duracion_min ||
        servicios.find((s) => s.id === payload.servicio_id)?.duracion_min ||
        30;

      setEventos((prev) => [
        ...prev,
        {
          id: t.id,
          title: `${t.cliente_nombre || payload.cliente_nombre || "—"} · ${t.servicio?.nombre || (servicios.find(s => s.id === payload.servicio_id)?.nombre) || "Servicio"}`,
          start: new Date(t.desde || payload.datetime),
          end: new Date(new Date(payload.datetime).getTime() + dur * 60000),
          servicio: t.servicio?.nombre || (servicios.find(s => s.id === payload.servicio_id)?.nombre),
          cliente_nombre: t.cliente?.nombre || t.cliente_nombre || payload.cliente_nombre || "—",
          notas: payload.notas || "",
          servicio_id: payload.servicio_id,
        },
      ]);
      setOpenNew(false);
    } catch {
      alert("No se pudo crear el turno");
    } finally {
      setLoading(false);
    }
  };

  const eliminarTurno = async () => {
    if (!selected) return;
    if (!confirm("¿Eliminar el turno seleccionado?")) return;
    try {
      await api.delete(`/turnos/${selected.id}`);
      setEventos((prev) => prev.filter((e) => e.id !== selected.id));
      setSelected(null);
    } catch {
      alert("No se pudo eliminar");
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER ancho */}
      <div className="-mx-4 lg:-mx-6 overflow-x-clip">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-400 p-5 md:p-6 text-white shadow">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  Gestión de Turnos
                </h1>
                <p className="text-sm md:text-base/relaxed opacity-90">
                  Organizá tus servicios y horarios y administrá tus turnos de forma simple.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/servicios"
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-sky-700 px-4 py-2 text-sm font-extrabold ring-2 ring-white/80 shadow hover:brightness-95 focus-visible:ring-4 focus-visible:ring-white"
                  aria-label="Ir a Servicios"
                >
                  <span aria-hidden>🧰</span> <span>Servicios</span>
                </Link>
                <Link
                  to="/horarios"
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-sky-700 px-4 py-2 text-sm font-extrabold ring-2 ring-white/80 shadow hover:brightness-95 focus-visible:ring-4 focus-visible:ring-white"
                  aria-label="Ir a Horarios"
                >
                  <span aria-hidden>⏱️</span> <span>Horarios</span>
                </Link>
                <button
                  onClick={() => {
                    setSelected(null);
                    setOpenNew(true);
                  }}
                  className="rounded-xl bg-white text-sky-700 px-4 py-2 text-sm font-semibold shadow hover:brightness-95"
                >
                  + Agregar turno
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GRID principal + derecha */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        {/* COLUMNA PRINCIPAL */}
        <div className="min-w-0">
          {/* Calendario */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <Calendario
              turnos={eventos}
              onSelectEvent={onSelectEvent}
              onSelectSlot={onSelectSlot}
              defaultView="month"
              height={760}
            />
          </div>
        </div>

        {/* SIDEBAR DERECHA (sticky) */}
        <aside className="space-y-4 w-full xl:w-[340px] self-start xl:sticky xl:top-[96px]">
          {/* Métricas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <div className="text-xs text-slate-500">Servicios</div>
              <div className="text-xl font-semibold">{servicios.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <div className="text-xs text-slate-500">Turnos hoy</div>
              <div className="text-xl font-semibold">{agendaDeHoy.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <div className="text-xs text-slate-500">Turnos totales</div>
              <div className="text-xl font-semibold">{eventos.length}</div>
            </div>
          </div>

          {/* Acciones de turnos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 font-medium text-slate-700">Acciones de turnos</div>
            <p className="mb-3 text-xs text-slate-500">
              Para <b>agregar</b>, seleccioná un bloque en el calendario. Para{" "}
              <b>editar</b> o <b>cancelar</b>, hacé click en el turno y luego presioná el botón.
            </p>

            <div className="grid grid-cols-1 gap-2">
              {/* Principal */}
              <button
                onClick={() => {
                  setSelected(null);
                  setOpenNew(true);
                }}
                className="w-full rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/50 hover:bg-sky-700"
              >
                + Agregar turno
              </button>

              {/* Editar / Posponer (violeta/indigo). Siempre con color; deshabilitado = opaco */}
              <button
                disabled={!selected}
                onClick={() => setOpenNew(true)}
                className={cx(
                  "w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition shadow focus:outline-none",
                  "bg-gradient-to-r from-indigo-500 to-violet-500 text-white",
                  !selected && "opacity-50 cursor-not-allowed"
                )}
              >
                Editar / Posponer
              </button>

              {/* Cancelar (rojo degradé como PanelShell). Siempre con color; deshabilitado = opaco */}
              <button
                disabled={!selected}
                onClick={eliminarTurno}
                className={cx(
                  "w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition shadow focus:outline-none",
                  "bg-gradient-to-r from-rose-600 to-red-500 text-white",
                  !selected && "opacity-50 cursor-not-allowed"
                )}
              >
                Cancelar
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              {selected
                ? "Turno seleccionado listo para acciones."
                : "Elegí un turno del calendario para ver acciones."}
            </div>
          </div>

          {/* Agenda de hoy (cliente · servicio dentro del bloque) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 font-medium text-slate-700">
              Agenda de hoy · {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </div>
            {agendaDeHoy.length === 0 ? (
              <div className="text-sm text-slate-500">No hay turnos para hoy.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {agendaDeHoy.map((e) => (
                  <li key={e.id} className="py-2">
                    <div className="font-medium">
                      {format(e.start, "HH:mm", { locale: es })} · {e.cliente_nombre || "—"} · {e.servicio || e.title}
                    </div>
                    {e.notas && (
                      <div className="text-slate-500 text-xs mt-0.5">Notas: {e.notas}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sugerencias más visibles (degradé suave) */}
          <div className="rounded-2xl p-[1px] bg-gradient-to-r from-sky-200 via-cyan-200 to-emerald-200 shadow-sm">
            <div className="rounded-2xl bg-white p-4">
              <SugerenciasTicker items={sugerencias} />
            </div>
          </div>
        </aside>
      </div>

      {/* Modal crear/editar */}
      <Modal
        open={openNew}
        onClose={() => setOpenNew(false)}
        title={selected ? "Editar turno" : "Nuevo turno"}
      >
        <TurnoForm
          initial={
            selected
              ? {
                  servicio_id: selected.servicio_id,
                  fecha: selected.start,
                  hora: format(selected.start, "HH:mm"),
                  cliente_nombre: selected.cliente_nombre,
                  notas: selected.notas || "",
                }
              : {}
          }
          servicios={servicios}
          onCancel={() => setOpenNew(false)}
          onSubmit={async (payload) => {
            if (selected) {
              try {
                setLoading(true);
                await api.patch(`/turnos/${selected.id}`, payload);

                const dur =
                  servicios.find((s) => s.id === payload.servicio_id)?.duracion_min || 30;

                setEventos((prev) =>
                  prev.map((e) =>
                    e.id === selected.id
                      ? {
                          ...e,
                          title: `${payload.cliente_nombre || "—"} · ${
                            servicios.find((s) => s.id === payload.servicio_id)?.nombre || "Servicio"
                          }`,
                          start: new Date(payload.datetime),
                          end: new Date(new Date(payload.datetime).getTime() + dur * 60000),
                          cliente_nombre: payload.cliente_nombre,
                          notas: payload.notas,
                          servicio_id: payload.servicio_id,
                          servicio:
                            servicios.find((s) => s.id === payload.servicio_id)?.nombre || e.servicio,
                        }
                      : e
                  )
                );
                setSelected(null);
                setOpenNew(false);
              } catch {
                alert("No se pudo actualizar");
              } finally {
                setLoading(false);
              }
            } else {
              await crearTurno(payload);
            }
          }}
          loading={loading}
        />
      </Modal>
    </div>
  );
}
