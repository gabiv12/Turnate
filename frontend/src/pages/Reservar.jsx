// src/pages/Reservar.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { format, startOfDay, endOfDay, isSameDay, addMinutes } from "date-fns";
import es from "date-fns/locale/es";
import api from "../services/api";
import PublicCalendar from "../components/PublicCalendar";
import { listarTurnosPublicos, reservarTurno } from "../services/turnos";

const cx = (...c) => c.filter(Boolean).join(" ");

export default function Reservar() {
  const { codigo: codigoParam } = useParams();
  const location = useLocation();

  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");

  const [emp, setEmp] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [turnos, setTurnos] = useState([]);

  const [fecha, setFecha] = useState(null);
  const [slot, setSlot] = useState(null);
  const [servicioId, setServicioId] = useState("");

  const [confirming, setConfirming] = useState(false);
  const [okMsg, setOkMsg] = useState("");

  // Evitar doble auto-búsqueda
  const didAutoFetchRef = useRef(false);

  // Leer código desde URL (param o query ?c=)
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("c");
    const initial = (codigoParam || q || "").toUpperCase();
    if (initial) setCodigo(initial);
  }, [codigoParam, location.search]);

  // Auto-buscar una sola vez si vino en la URL
  useEffect(() => {
    if (!didAutoFetchRef.current && codigo.trim()) {
      didAutoFetchRef.current = true;
      buscar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  // Paso 1: buscar por código (puede venir de URL o del input)
  const buscar = async () => {
    setError("");
    setOkMsg("");
    setEmp(null);
    setServicios([]);
    setHorarios([]);
    setTurnos([]);
    setFecha(null);
    setSlot(null);
    setServicioId("");

    const code = (codigo || "").trim().toUpperCase();
    if (!code) {
      setError("Ingresá un código.");
      return;
    }

    setBuscando(true);
    try {
      // Emprendimiento
      const e = await api.get(`/emprendedores/by-codigo/${code}`);
      setEmp(e.data);

      // Servicios + horarios en paralelo
      const [rs, rh] = await Promise.all([
        api.get(`/servicios/de/${code}`),
        api.get(`/horarios/de/${code}`),
      ]);
      setServicios(rs.data || []);
      setHorarios(rh.data || []);

      // Turnos del mes en curso → para ocultar slots ocupados
      const now = new Date();
      const desde = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).toISOString();
      const hasta = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)).toISOString();
      const t = await listarTurnosPublicos(code, { desde, hasta });
      setTurnos(t || []);
    } catch (err) {
      setError(err?.response?.data?.detail || "No se encontró el emprendimiento");
    } finally {
      setBuscando(false);
    }
  };

  // Enter para buscar (sin botón extra)
  const onKeyDownCodigo = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      didAutoFetchRef.current = true; // evita auto-busca de efecto
      buscar();
    }
  };

  // Días habilitados por horarios (si hay al menos un horario activo ese día)
  const isDayEnabled = (date) => {
    const day = date.getDay(); // 0=Dom
    return horarios.some((h) => h.activo && Number(h.dia_semana) === day);
  };

  // Slots disponibles del día + filtro por turnos ocupados
  const slots = useMemo(() => {
    if (!fecha || !horarios?.length) return [];
    const day = fecha.getDay();

    // turnos del día
    const ocupados = (turnos || [])
      .filter((t) => isSameDay(new Date(t.inicio || t.desde || t.datetime), fecha))
      .map((t) => ({
        inicio: new Date(t.inicio || t.desde || t.datetime),
        fin: new Date(t.fin || t.hasta || addMinutes(new Date(t.inicio || t.datetime), 30)),
      }));

    const list = [];
    horarios
      .filter((h) => h.activo && Number(h.dia_semana) === day)
      .forEach((h) => {
        const [hhD, mmD] = String(h.hora_desde).split(":").map(Number);
        const [hhH, mmH] = String(h.hora_hasta).split(":").map(Number);
        const base = new Date(fecha);
        base.setHours(hhD, mmD, 0, 0);
        const end = new Date(fecha);
        end.setHours(hhH, mmH, 0, 0);
        const step = Number(h.intervalo_min || h.intervalo_minutos || 30);

        for (let d = new Date(base); d < end; d = addMinutes(d, step)) {
          const fin = addMinutes(new Date(d), step);
          // colisión
          const choca = ocupados.some((o) => o.inicio < fin && o.fin > d);
          if (!choca) list.push(new Date(d));
        }
      });

    return list;
  }, [fecha, horarios, turnos]);

  // Confirmar reserva → abre modal/confirm
  const onConfirm = () => setConfirming(true);

  // Enviar reserva a /turnos/compat
  const confirmarReserva = async () => {
    if (!emp || !slot || !servicioId) return;
    try {
      setBuscando(true);
      setError("");
      const payload = {
        datetime: slot.toISOString(), // el back calcula fin por servicio
        servicio_id: Number(servicioId),
        cliente_nombre: "",
        notas: "",
      };
      await reservarTurno(emp.codigo_cliente, payload);
      setOkMsg("¡Listo! Tu reserva fue creada. Te enviamos un correo de confirmación.");
      setConfirming(false);

      // refrescar turnos del día para ocultar slot recién ocupado
      const desde = startOfDay(new Date(slot)).toISOString();
      const hasta = endOfDay(new Date(slot)).toISOString();
      const tt = await listarTurnosPublicos(emp.codigo_cliente, { desde, hasta });
      setTurnos(tt || []);
      setSlot(null);
      setServicioId("");
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo crear la reserva");
      setConfirming(false);
    } finally {
      setBuscando(false);
    }
  };

  // Logo (usa emp.logo_url / emp.logo si viene del back; si no, el de public/)
  const logoSrc =
    emp?.logo_url ||
    emp?.logo ||
    emp?.imagen ||
    "/images/imageperfil.png";

  return (
    <div className="container-page py-4 md:py-6 space-y-4">
      {/* Hero / foto + info del emprendimiento */}
      <div className="booking-hero">
        <div className="booking-hero__media">
          <img src="/images/ReservaCodigo.png" alt="Reservá tu turno" />
        </div>
        <div className="booking-hero__body">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="booking-hero__title">
                {emp ? emp.nombre || "Emprendimiento" : "Reservá tu turno"}
              </div>
              <div className="booking-hero__meta">
                {emp
                  ? emp.descripcion || "Elegí fecha y hora para reservar"
                  : "Ingresá el código del emprendimiento para continuar"}
              </div>
            </div>

            {/* Buscar por código (Enter dispara búsqueda) */}
            <div className="flex gap-2">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={onKeyDownCodigo}
                placeholder="Código (p.ej. MIRKO)"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm w-44"
                title="Escribí el código y presioná Enter"
              />
              {/* Se eliminó el botón extra de Buscar */}
            </div>
          </div>

          {/* tips / recomendaciones */}
          <hr className="my-4 hr-soft" />
          <div className="text-sm text-slate-600">
            1) Ingresá el código • 2) Elegí un <b>día</b> • 3) Elegí un <b>horario</b> • 4) Elegí <b>servicio</b> y confirmá.
          </div>
        </div>
      </div>

      {/* Paso calendario / slots / servicio */}
      {emp && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
          {/* Columna principal */}
          <div className="card p-4">
            <div className="mb-3 font-medium text-slate-800">Elegí un día</div>
            <PublicCalendar
              selectedDate={fecha}
              onSelectDate={(d) => {
                setFecha(d);
                setSlot(null);
              }}
              isDayEnabled={isDayEnabled}
            />

            {/* Slots del día */}
            {fecha && (
              <>
                <hr className="my-4 hr-soft" />
                <div className="mb-2 font-medium text-slate-800">
                  Horarios disponibles — {format(fecha, "EEEE d 'de' MMMM", { locale: es })}
                </div>
                {slots.length === 0 ? (
                  <div className="text-sm text-slate-500">No hay horarios para este día.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {slots.map((d, i) => {
                      const sel = slot && d.getTime() === slot.getTime();
                      return (
                        <button
                          key={i}
                          className={cx(
                            "rounded-xl px-3 py-2 text-sm border",
                            sel
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white border-slate-300 hover:bg-slate-50"
                          )}
                          onClick={() => setSlot(d)}
                        >
                          {format(d, "HH:mm")}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar de acción */}
          <aside className="card p-4 lg:sticky lg:top-24 h-fit">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-slate-800">Confirmación</div>
              {/* Logo / tarjetita */}
              <div className="flex items-center gap-2">
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <div className="text-slate-500">Emprendimiento</div>
                <div className="font-medium">{emp?.nombre || "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">Fecha</div>
                <div className="font-medium">
                  {fecha ? format(fecha, "EEEE d 'de' MMMM", { locale: es }) : "—"}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Horario</div>
                <div className="font-medium">{slot ? format(slot, "HH:mm") : "—"}</div>
              </div>

              <div>
                <div className="text-slate-500 mb-1">Servicio</div>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={servicioId}
                  onChange={(e) => setServicioId(e.target.value)}
                  disabled={!slot}
                >
                  <option value="">Elegí…</option>
                  {servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} · {s.duracion_min || s.duracion_minutos || 30} min
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="mt-4 w-full btn-primary disabled:opacity-60"
              onClick={onConfirm}
              disabled={!slot || !servicioId}
            >
              Confirmar reserva
            </button>

            {error && (
              <div className="mt-3 rounded-xl bg-rose-50 text-rose-700 text-sm px-3 py-2 border border-rose-100">
                {error}
              </div>
            )}
            {okMsg && (
              <div className="mt-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-3 py-2 border border-emerald-100">
                {okMsg}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Modal de confirmación */}
      {confirming && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setConfirming(false)} />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
              <div className="px-5 py-4 border-b border-slate-100 font-semibold">
                Confirmar reserva
              </div>
              <div className="p-5 text-sm space-y-2">
                <div>Emprendimiento: <b>{emp?.nombre}</b></div>
                <div>Fecha: <b>{fecha ? format(fecha, "EEEE d 'de' MMMM", { locale: es }) : "-"}</b></div>
                <div>Hora: <b>{slot ? format(slot, "HH:mm") : "-"}</b></div>
                <div>Servicio: <b>{servicios.find(s => s.id === Number(servicioId))?.nombre || "-"}</b></div>
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <button className="btn-plain" onClick={() => setConfirming(false)}>Volver</button>
                <button className="btn-primary" onClick={confirmarReserva}>Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
