// src/pages/Turnos.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import Calendario from "../hooks/Calendario.jsx";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
} from "date-fns";
import es from "date-fns/locale/es";
import { AnimatePresence, motion } from "framer-motion";

const cx = (...c) => c.filter(Boolean).join(" ");
const btnMinimal = "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/40";

const IconPlus = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
    className="h-4 w-4" {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconLayers = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
    className="h-4 w-4" {...props}>
    <path d="M12 3l8 4-8 4-8-4 8-4Z" />
    <path d="M4 12l8 4 8-4" />
    <path d="M4 17l8 4 8-4" />
  </svg>
);
const IconClock = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
    className="h-4 w-4" {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

function SugerenciasTicker({ items = [], intervalMs = 4200 }) {
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!items.length) return;
    timer.current = setInterval(() => {
      setFlash(true);
      setTimeout(() => setFlash(false), 180);
      setIdx((i) => (i + 1) % items.length);
    }, intervalMs);
    return () => clearInterval(timer.current);
  }, [intervalMs, items.length]);

  if (!items?.length) return null;

  return (
    <div className="select-none">
      <div className={cx(
        "min-h-[26px] text-slate-800 text-sm leading-6 transition",
        flash && "animate-pulse"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={{ duration: 0.26 }}
          >
            {items[idx]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-2 flex gap-1" aria-hidden="true">
        {items.map((_, i) => (
          <span key={i}
            className={cx("h-1.5 w-1.5 rounded-full",
              i === idx ? "bg-sky-500" : "bg-slate-300")}
          />
        ))}
      </div>
    </div>
  );
}

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

function TurnoForm({ initial, servicios = [], onSubmit, onCancel, loading }) {
  const normDur = (s) => s?.duracion_min ?? s?.duracion_minutos ?? 30;

  const [form, setForm] = useState(() => {
    const f = initial || {};
    const fechaISO =
      f.fecha instanceof Date
        ? f.fecha.toISOString().slice(0, 10)
        : typeof f.fecha === "string"
        ? f.fecha
        : new Date().toISOString().slice(0, 10);

    const hora =
      f.fecha instanceof Date ? format(f.fecha, "HH:mm") : f.hora || "";

    return {
      servicio_id: f.servicio_id ? String(f.servicio_id) : "",
      fecha: fechaISO,
      hora,
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
      _duracion:
        normDur(servicios.find((s) => s.id === Number(form.servicio_id))) || 30,
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
              {s.nombre} · {(s.duracion_min ?? s.duracion_minutos ?? 30)} min
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
        <span className="block text-sm font-medium text-slate-700">Notas</span>
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

const toDate = (v) => (v ? new Date(v) : null);

function mapTurnoParaCalendario(t, servicios = []) {
  const svc = servicios.find((s) => s.id === Number(t.servicio_id));
  const durMin = t?.duracion_minutos ?? svc?.duracion_min ?? svc?.duracion_minutos ?? 30;

  const start =
    toDate(t.inicio) || toDate(t.desde) || toDate(t.datetime) || new Date();
  const end =
    toDate(t.fin) ||
    toDate(t.hasta) ||
    new Date(start.getTime() + durMin * 60000);

  const nombreServicio =
    t?.servicio?.nombre || svc?.nombre || t.servicio_nombre || "Servicio";
  const cliente = t?.cliente?.nombre || t.cliente_nombre || "—";

  return {
    id: t.id,
    title: `${cliente} · ${nombreServicio}`,
    start,
    end,
    servicio_id: t.servicio_id ?? svc?.id ?? null,
    servicio: nombreServicio,
    cliente_nombre: cliente,
    notas: t.notas ?? "",
    raw: t,
  };
}

export default function Turnos() {
  const navigate = useNavigate();
  const [isEmprendedor, setIsEmprendedor] = useState(false);
  const [owner, setOwner] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [rawTurnos, setRawTurnos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [openNew, setOpenNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const [rStart, setRStart] = useState(() => {
    const d = new Date();
    const s = startOfMonth(d);
    s.setHours(0, 0, 0, 0);
    return s;
  });
  const [rEnd, setREnd] = useState(() => {
    const d = new Date();
    const e = endOfMonth(d);
    e.setHours(23, 59, 59, 999);
    return e;
  });

  const sugerencias = [
    "Cargá tus Servicios y definí Horarios antes de tomar turnos.",
    "Hacé clic en un turno para habilitar Editar / Cancelar.",
    "Agregá notas con detalles o preferencias del cliente.",
    "Creá servicios con distinta duración para optimizar tu agenda.",
    "Revisá la próxima semana para anticipar picos.",
    "Bloqueá feriados en Horarios para evitar reservas.",
  ];

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (String(u?.rol || "").toLowerCase() === "emprendedor" || u?.es_emprendedor) {
        setIsEmprendedor(true);
      }
    } catch {}
    (async () => {
      try {
        const me = await api.get("/emprendedores/mi");
        if (me?.data?.id) {
          setIsEmprendedor(true);
          setOwner({ id: me.data.id, codigo: me.data.codigo_cliente });
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (isEmprendedor) {
          const rs = await api.get("/servicios/mis");
          setServicios(Array.isArray(rs.data) ? rs.data : []);
          try {
            const rh = await api.get("/horarios/mis");
            setHorarios(Array.isArray(rh.data) ? rh.data : []);
          } catch {}
        } else {
          setServicios([]);
          setHorarios([]);
        }
      } catch {}
    })();
  }, [isEmprendedor]);

  async function fetchTurnosRange(start, end) {
    try {
      const params = { desde: start.toISOString(), hasta: end.toISOString() };
      const url = isEmprendedor ? "/turnos/owner" : "/turnos/mis";
      const rt = await api.get(url, { params });
      const arr = Array.isArray(rt.data) ? rt.data : [];
      setRawTurnos(arr);
      setEventos(arr.map((t) => mapTurnoParaCalendario(t, servicios)));
    } catch {
      setRawTurnos([]);
      setEventos([]);
    }
  }

  const firstLoadRef = useRef(false);
  useEffect(() => {
    if (firstLoadRef.current) return;
    firstLoadRef.current = true;
    fetchTurnosRange(rStart, rEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmprendedor]);

  useEffect(() => {
    setEventos(rawTurnos.map((t) => mapTurnoParaCalendario(t, servicios)));
  }, [servicios, rawTurnos]);

  const handleRangeRequest = (start, end /*, view*/) => {
    setRStart(start);
    setREnd(end);
    fetchTurnosRange(start, end);
  };

  const onSelectEvent = (evt) => setSelected(evt);
  const onSelectSlot = () => {
    setSelected(null);
    if (isEmprendedor) setOpenNew(true);
  };

  const enabledWeekdays = useMemo(() => {
    const set = new Set(
      (horarios || [])
        .filter((h) => h.activo !== false)
        .map((h) => Number(h.dia_semana))
    );
    return set;
  }, [horarios]);

  const dayPropGetter = (date) => {
    if (!isEmprendedor) return {};
    const wd = date.getDay();
    if (!enabledWeekdays.has(wd)) {
      return { style: { backgroundColor: "#f3f4f6", color: "#9ca3af" } };
    }
    return {};
  };

  const crearTurno = async (payload) => {
    try {
      setLoading(true);
      const body = {
        servicio_id: payload.servicio_id,
        datetime: payload.datetime,
        cliente_nombre: payload.cliente_nombre,
        notas: payload.notas,
        ...(owner?.id ? { emprendedor_id: owner.id } : {}),
      };
      await api.post("/turnos/compat", body);
      await fetchTurnosRange(rStart, rEnd);
      setOpenNew(false);
      alert("Turno creado con éxito.");
    } catch {
      alert("No se pudo crear el turno.");
    } finally {
      setLoading(false);
    }
  };

  const editarTurno = async (payload) => {
    if (!selected) return;
    try {
      setLoading(true);
      const dur = payload._duracion ?? 30;
      const inicio = new Date(payload.datetime);
      const fin = new Date(inicio.getTime() + dur * 60000);

      await api.patch(`/turnos/${selected.id}`, {
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        servicio_id: payload.servicio_id,
        cliente_nombre: payload.cliente_nombre,
        notas: payload.notas,
      });

      await fetchTurnosRange(rStart, rEnd);
      setSelected(null);
      setOpenNew(false);
      alert("Turno actualizado.");
    } catch {
      alert("No se pudo actualizar el turno.");
    } finally {
      setLoading(false);
    }
  };

  const eliminarTurno = async () => {
    if (!selected) return;
    if (!confirm("¿Eliminar el turno seleccionado?")) return;
    try {
      await api.delete(`/turnos/${selected.id}`);
      await fetchTurnosRange(rStart, rEnd);
      setSelected(null);
      alert("Turno eliminado con éxito.");
    } catch {
      alert("No se pudo eliminar el turno.");
    }
  };

  const agendaDeHoy = useMemo(() => {
    const d = new Date();
    const s = startOfDay(d);
    const e = endOfDay(d);
    return eventos
      .filter((ev) => ev.start >= s && ev.start <= e)
      .sort((a, b) => a.start - b.start);
  }, [eventos]);

  if (!isEmprendedor) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-slate-700">
              Para reservar, ingresá el <b>código</b> del emprendimiento.
            </div>
            <button
              onClick={() => navigate("/reservar")}
              className="rounded-xl bg-sky-600 text-white px-4 py-2.5 text-sm font-semibold"
            >
              Sacar turno
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <Calendario
            turnos={eventos}
            onSelectEvent={onSelectEvent}
            onSelectSlot={() => {}}
            defaultView="month"
            height={680}
            onRangeRequest={handleRangeRequest}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
                        className={btnMinimal}
                        aria-label="Ir a Servicios"
                      >
                        <IconLayers />
                        <span>Servicios</span>
                      </Link>

                      <Link
                        to="/horarios"
                        className={btnMinimal}
                        aria-label="Ir a Horarios"
                      >
                        <IconClock />
                        <span>Horarios</span>
                      </Link>

                      <button
                        onClick={() => { setSelected(null); setOpenNew(true); }}
                        className={btnMinimal}
                        aria-label="Agregar turno"
                      >
                        <IconPlus />
                        <span>Agregar turno</span>
                      </button>
                    </div>

            </div>
          </div>
        </div>
      </div>

      {/* === DOS COLUMNAS: desde lg usa flex; sidebar fijo a 320px === */}
      <div className="lg:flex lg:items-start lg:gap-4">
        {/* Calendario */}
        <div className="min-w-0 lg:flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm relative z-10 overflow-visible">
            <Calendario
              turnos={eventos}
              onSelectEvent={(e) => setSelected(e)}
              onSelectSlot={() => { setSelected(null); setOpenNew(true); }}
              defaultView="month"
              height={680}
              dayPropGetter={dayPropGetter}
              onRangeRequest={handleRangeRequest}
            />
          </div>
        </div>

        {/* Sidebar derecha */}
        <aside className="space-y-4 w-full lg:w-80 lg:basis-80 lg:shrink-0 self-start lg:sticky lg:top-[96px] z-0 mt-4 lg:mt-0">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <div className="text-xs text-slate-500">Servicios</div>
              <div className="text-xl font-semibold">{servicios.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <div className="text-xs text-slate-500">Turnos hoy</div>
              <div className="text-xl font-semibold">
                {
                  eventos.filter((e) => {
                    const d = new Date();
                    const s = startOfDay(d);
                    const ee = endOfDay(d);
                    return e.start >= s && e.start <= ee;
                  }).length
                }
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <div className="text-xs text-slate-500">Turnos periodo</div>
              <div className="text-xl font-semibold">{eventos.length}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 font-medium text-slate-700">Acciones de turnos</div>

            <ul className="mb-3 text-xs text-slate-500 space-y-1.5">
              <li>• Para <b>agregar</b>, seleccioná un bloque en el calendario o usá el botón.</li>
              <li>• Para <b>editar</b> o <b>posponer</b>, hacé click en un turno y luego “Editar / Posponer”.</li>
              <li>• Para <b>cancelar</b>, seleccioná un turno y tocá “Cancelar”.</li>
            </ul>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => { setSelected(null); setOpenNew(true); }}
                className="w-full rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white shadow focus-visible:ring-4 focus-visible:ring-sky-300/50 hover:bg-sky-700"
              >
                + Agregar turno
              </button>

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

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                {selected
                  ? "Turno seleccionado listo para acciones."
                  : "Elegí un turno del calendario para ver acciones."}
              </span>
              <button
                onClick={() => fetchTurnosRange(rStart, rEnd)}
                className="underline underline-offset-2 hover:text-slate-700"
                title="Actualizar"
              >
                Actualizar
              </button>
            </div>
          </div>

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

          <div className="rounded-2xl p-[1px] bg-gradient-to-r from-sky-200 via-cyan-200 to-emerald-200 shadow-sm">
            <div className="rounded-2xl bg-white p-4">
              <SugerenciasTicker items={sugerencias} />
            </div>
          </div>
        </aside>
      </div>

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
              await editarTurno(payload);
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