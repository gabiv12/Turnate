// src/pages/Turnos.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import Calendario from "../hooks/Calendario.jsx";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import es from "date-fns/locale/es";

// util cls
const cx = (...c) => c.filter(Boolean).join(" ");

/* =========================
   Íconos inline
========================= */
const IconLayers = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" {...props}>
    <path d="M12 3l8 4-8 4-8-4 8-4Z" />
    <path d="M4 12l8 4 8-4" />
    <path d="M4 17l8 4 8-4" />
  </svg>
);
const IconClock = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

/* =========================
   Helpers
========================= */
const toDate = (v) => (v ? new Date(v) : null);

function mapTurnoParaCalendario(t, servicios = []) {
  const svc = servicios.find((s) => Number(s.id) === Number(t.servicio_id));
  const durMin = t?.duracion_minutos ?? svc?.duracion_min ?? svc?.duracion_minutos ?? 30;

  const start = toDate(t.inicio) || toDate(t.desde) || toDate(t.datetime) || new Date();
  const end = toDate(t.fin) || toDate(t.hasta) || new Date(start.getTime() + durMin * 60000);

  const nombreServicio = t?.servicio?.nombre || svc?.nombre || t.servicio_nombre || "Servicio";
  // nombre de cliente: si viene vacío/solo espacios => null (no mostramos guiones)
  const rawCliente =
    (t?.cliente?.nombre ??
      t?.cliente_nombre ??
      t?.nombre_cliente ??
      "").toString().trim();
  const cliente = rawCliente.length ? rawCliente : null;

  return {
    id: t.id,
    // Si hay cliente: "Nombre · Servicio". Si no: solo "Servicio" (sin guiones).
    title: cliente ? `${cliente} · ${nombreServicio}` : nombreServicio,
    start,
    end,
    servicio_id: t.servicio_id ?? svc?.id ?? null,
    servicio: nombreServicio,
    cliente_nombre: cliente || "",
    notas: t.notas ?? "",
    raw: t,
  };
}

/* =========================
   Página Turnos
========================= */
export default function Turnos() {
  const navigate = useNavigate();

  // rol / dueño
  const [isEmprendedor, setIsEmprendedor] = useState(false);
  const [owner, setOwner] = useState(null); // { id, codigo }

  // catálogo
  const [servicios, setServicios] = useState([]);
  const [horarios, setHorarios] = useState([]);

  // turnos
  const [eventos, setEventos] = useState([]);
  const [rawTurnos, setRawTurnos] = useState([]);

  // UI
  const [selected, setSelected] = useState(null);
  const [openNew, setOpenNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // rango visible (para el calendario / fetch)
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

  // detectar rol y dueño
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

  // cargar catálogos
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

  // fetch turnos para un rango
  async function fetchTurnosRange(start, end) {
    try {
      const params = { desde: start.toISOString(), hasta: end.toISOString() };
      const url = isEmprendedor ? "/turnos/owner" : "/turnos/mis";
      const rt = await api.get(url, { params });
      const arr = Array.isArray(rt.data) ? rt.data : [];
      setRawTurnos(arr);
      // mapeo inmediato a eventos
      setEventos(arr.map((t) => mapTurnoParaCalendario(t, servicios)));
    } catch {
      setRawTurnos([]);
      setEventos([]);
    }
  }

  // primer fetch (una vez)
  const firstLoadRef = useRef(false);
  useEffect(() => {
    if (firstLoadRef.current) return;
    firstLoadRef.current = true;
    fetchTurnosRange(rStart, rEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmprendedor]);

  // si cambia catálogo de servicios, remapeamos los eventos (para duraciones/nombres)
  useEffect(() => {
    setEventos(rawTurnos.map((t) => mapTurnoParaCalendario(t, servicios)));
  }, [servicios, rawTurnos]);

  // handler que recibe el Calendario al navegar/cambiar vista
  const handleRangeRequest = (start, end /*, view*/) => {
    setRStart(start);
    setREnd(end);
    fetchTurnosRange(start, end);
  };

  // selección / slot
  const onSelectEvent = (evt) => setSelected(evt);
  const onSelectSlot = () => {
    setSelected(null);
    if (isEmprendedor) setOpenNew(true);
  };

  // sombrear días sin horario
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
    const wd = date.getDay(); // 0..6
    if (!enabledWeekdays.has(wd)) {
      return { style: { backgroundColor: "#f3f4f6", color: "#9ca3af" } };
    }
    return {};
  };

  // crear / editar / borrar (endpoints de compatibilidad)
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

  // agenda de hoy (sidebar)
  const agendaDeHoy = useMemo(() => {
    const d = new Date();
    const s = startOfDay(d);
    const e = endOfDay(d);
    return eventos
      .filter((ev) => ev.start >= s && ev.start <= e)
      .sort((a, b) => a.start - b.start);
  }, [eventos]);

  /* =========================
     VISTA CLIENTE (solo visualización)
  ========================= */
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
            onRangeRequest={handleRangeRequest}
          />
        </div>
      </div>
    );
  }

  /* =========================
     VISTA EMPRENDEDOR
  ========================= */
  return (
    <div className="space-y-4">
      {/* Header visual */}
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

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/servicios"
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-sky-700 px-4 py-2 text-sm font-semibold ring-1 ring-white/70 shadow hover:brightness-95"
                  aria-label="Ir a Servicios"
                >
                  <IconLayers /> <span>Servicios</span>
                </Link>

                <Link
                  to="/horarios"
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-sky-700 px-4 py-2 text-sm font-semibold ring-1 ring-white/70 shadow hover:brightness-95"
                  aria-label="Ir a Horarios"
                >
                  <IconClock /> <span>Horarios</span>
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

      {/* Grid principal: calendario + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        {/* Calendario */}
        <div className="min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <Calendario
              turnos={eventos}
              onSelectEvent={(e) => setSelected(e)}
              onSelectSlot={() => {
                setSelected(null);
                setOpenNew(true);
              }}
              defaultView="month"
              height={760}
              dayPropGetter={dayPropGetter}
              onRangeRequest={handleRangeRequest}
            />
          </div>
        </div>

        {/* Sidebar derecha */}
        <aside className="space-y-4 w-full xl:w-[340px] self-start xl:sticky xl:top-[96px]">
          {/* KPIs */}
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

          {/* Acciones */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 font-medium text-slate-700">Acciones de turnos</div>

            <ul className="mb-3 text-xs text-slate-500 space-y-1.5">
              <li>• Para <b>agregar</b>, seleccioná un bloque en el calendario o usá el botón.</li>
              <li>• Para <b>editar</b> o <b>posponer</b>, hacé click en un turno y luego “Editar / Posponer”.</li>
              <li>• Para <b>cancelar</b>, seleccioná un turno y tocá “Cancelar”.</li>
            </ul>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  setSelected(null);
                  setOpenNew(true);
                }}
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
                      {format(e.start, "HH:mm", { locale: es })} ·{" "}
                      {e.cliente_nombre || "Cliente"} · {e.servicio || e.title}
                    </div>
                    {e.notas && (
                      <div className="text-slate-500 text-xs mt-0.5">Notas: {e.notas}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Modal crear/editar — (tu modal actual, no incluido aquí para mantener tu estructura) */}
      {/* Conservá tu implementación de TurnoForm/Modal si ya funciona. */}
    </div>
  );
}
