// src/pages/Turnos.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import Calendario from "../hooks/Calendario";
import { format, startOfDay, endOfDay } from "date-fns";
import es from "date-fns/locale/es";
import { AnimatePresence, motion } from "framer-motion";

const cx = (...c) => c.filter(Boolean).join(" ");

// Íconos inline minimal
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

/* =========================================================
   SUGERENCIAS (ticker)
   ========================================================= */
function SugerenciasTicker({ items = [], intervalMs = 4200 }) {
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!items.length) return;
    timer.current = setInterval(() => {
      setFlash(true);
      setTimeout(() => setFlash(false), 220);
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
            transition={{ duration: 0.28 }}
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
   FORMULARIO DE TURNO
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

/* =========================================================
   HELPERS
   ========================================================= */
const toDate = (v) => (v ? new Date(v) : null);
function mapTurnoParaCalendario(t, servicios = []) {
  const start =
    toDate(t.inicio) || toDate(t.desde) || toDate(t.datetime) || new Date();
  const durMin =
    t?.servicio?.duracion_min ||
    servicios.find((s) => s.id === Number(t.servicio_id))?.duracion_min ||
    30;
  const end =
    toDate(t.fin) ||
    toDate(t.hasta) ||
    new Date(start.getTime() + durMin * 60000);

  const nombreServicio =
    t?.servicio?.nombre ||
    servicios.find((s) => s.id === Number(t.servicio_id))?.nombre ||
    t.titulo ||
    "Servicio";

  const cliente = t?.cliente?.nombre || t.cliente_nombre || "—";

  return {
    id: t.id,
    title: `${cliente} · ${nombreServicio}`,
    start,
    end,
    servicio_id: t.servicio_id ?? null,
    servicio: nombreServicio,
    cliente_nombre: cliente,
    notas: t.notas ?? "",
    raw: t,
  };
}

/* =========================================================
   PÁGINA TURNOS
   ========================================================= */
export default function Turnos() {
  const navigate = useNavigate();

  const [isEmprendedor, setIsEmprendedor] = useState(false);
  const [owner, setOwner] = useState(null); // {id, codigo}
  const [servicios, setServicios] = useState([]);
  const [horarios, setHorarios] = useState([]); // para sombrear días sin horario
  const [eventos, setEventos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [openNew, setOpenNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const sugerencias = [
    "Cargá tus Servicios y definí Horarios antes de tomar turnos.",
    "Hacé clic en un turno para habilitar Editar / Cancelar.",
    "Agregá notas con detalles o preferencias del cliente.",
    "Creá servicios con distinta duración para optimizar tu agenda.",
    "Revisá la próxima semana para anticipar picos.",
    "Bloqueá feriados en Horarios para evitar reservas.",
  ];

  // Detectar rol
  useEffect(() => {
    const uRaw = localStorage.getItem("user");
    const u = uRaw ? JSON.parse(uRaw) : null;
    if (String(u?.rol || "").toLowerCase() === "emprendedor") {
      setIsEmprendedor(true);
    }
    (async () => {
      try {
        const me = await api.get("/emprendedores/mi");
        if (me?.data?.id) {
          setIsEmprendedor(true);
          setOwner({ id: me.data.id, codigo: me.data.codigo_cliente });
        } else {
          setIsEmprendedor(false);
          setOwner(null);
        }
      } catch {
        // no emprendedor logueado
        setIsEmprendedor(false);
        setOwner(null);
      }
    })();
  }, []);

  // Carga inicial de servicios/horarios
  useEffect(() => {
    (async () => {
      try {
        if (isEmprendedor) {
          const rs = await api.get("/servicios/mis");
          setServicios(rs.data || []);
          try {
            const rh = await api.get("/horarios/mis");
            setHorarios(rh.data || []);
          } catch {}
        } else {
          setServicios([]);
          setHorarios([]);
        }
      } catch {}
    })();
  }, [isEmprendedor]);

  // Helper range del mes visible (mes actual)
  const monthRange = () => {
    const now = new Date();
    const desde = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).toISOString();
    const hasta = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)).toISOString();
    return { desde, hasta };
  };

  // Refrescar eventos (propios si cliente / owner si emprendedor)
  const refreshEventos = async () => {
    try {
      const { desde, hasta } = monthRange();
      const url = isEmprendedor ? "/turnos/owner" : "/turnos/mis";
      const rt = await api.get(url, { params: { desde, hasta } });
      const data = Array.isArray(rt.data) ? rt.data : [];
      setEventos(data.map((t) => mapTurnoParaCalendario(t, servicios)));
    } catch (e) {
      // opcional: console.warn(e);
    }
  };

  // Primera carga de turnos + cada vez que cambian servicios (para duraciones)
  useEffect(() => {
    refreshEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmprendedor, servicios.length]);

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
    if (isEmprendedor) setOpenNew(true);
  };

  // Sombrear días sin horario (si Calendario soporta dayPropGetter)
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
    const wd = date.getDay(); // 0=Dom..6=Sab
    if (!enabledWeekdays.has(wd)) {
      return {
        style: {
          backgroundColor: "#f3f4f6", // slate-100
          color: "#9ca3af", // slate-400
        },
      };
    }
    return {};
  };

  const crearTurno = async (payload) => {
    try {
      setLoading(true);
      // Para compat: enviamos datetime, servicio_id, cliente_nombre, notas y, si lo tenemos, emprendedor_id
      const body = {
        servicio_id: payload.servicio_id,
        datetime: payload.datetime, // el back calcula fin
        cliente_nombre: payload.cliente_nombre,
        notas: payload.notas,
        ...(owner?.id ? { emprendedor_id: owner.id } : {}),
      };
      await api.post("/turnos/compat", body);

      await refreshEventos(); // me aseguro de ver el turno nuevo
      setOpenNew(false);
      alert("Turno creado con éxito.");
    } catch (e) {
      alert("No se pudo crear el turno.");
    } finally {
      setLoading(false);
    }
  };

  const editarTurno = async (payload) => {
    if (!selected) return;
    try {
      setLoading(true);
      // Para PATCH armamos inicio/fin (por si el back lo requiere)
      const dur =
        servicios.find((s) => s.id === payload.servicio_id)?.duracion_min || 30;
      const inicio = new Date(payload.datetime);
      const fin = new Date(inicio.getTime() + dur * 60000);
      await api.patch(`/turnos/${selected.id}`, {
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        servicio_id: payload.servicio_id,
        cliente_nombre: payload.cliente_nombre,
        notas: payload.notas,
      });

      await refreshEventos();
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
      setEventos((prev) => prev.filter((e) => e.id !== selected.id));
      setSelected(null);
      alert("Turno eliminado con éxito.");
    } catch {
      alert("No se pudo eliminar el turno.");
    }
  };

  // CLIENTE (agenda solo de visualización + botón reservar)
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
            height={760}
          />
        </div>
      </div>
    );
  }

  // EMPRENDEDOR
  return (
    <div className="space-y-4">
      {/* HEADER ancho (igual visual) */}
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
                <Link to="/servicios" className="inline-flex items-center gap-2 rounded-xl bg-white text-sky-700 px-4 py-2 text-sm font-extrabold ring-2 ring-white/80 shadow hover:brightness-95 focus-visible:ring-4 focus-visible:ring-white" aria-label="Ir a Servicios">
                  <IconLayers /> <span>Servicios</span>
                </Link>

                <Link to="/horarios" className="inline-flex items-center gap-2 rounded-xl bg-white text-sky-700 px-4 py-2 text-sm font-extrabold ring-2 ring-white/80 shadow hover:brightness-95 focus-visible:ring-4 focus-visible:ring-white" aria-label="Ir a Horarios">
                  <IconClock /> <span>Horarios</span>
                </Link>

                <button
                  onClick={() => { setSelected(null); setOpenNew(true); }}
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
              onSelectEvent={(e) => setSelected(e)}
              onSelectSlot={onSelectSlot}
              defaultView="month"
              height={760}
              // sombreamos días sin horario (si el wrapper lo soporta)
              dayPropGetter={dayPropGetter}
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
                onClick={refreshEventos}
                className="underline underline-offset-2 hover:text-slate-700"
                title="Actualizar"
              >
                Actualizar
              </button>
            </div>
          </div>

          {/* Agenda de hoy */}
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

          {/* Sugerencias */}
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
