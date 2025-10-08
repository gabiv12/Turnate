// src/pages/Reservar.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  d.setMinutes(d.getMinutes() + mins);
  return d.toTimeString().slice(0, 5);
}
function sameDayISO(dateA, isoDateStr) {
  const a = new Date(dateA);
  const b = new Date(isoDateStr);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function Reservar() {
  const { code } = useParams();
  const [emp, setEmp] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [form, setForm] = useState({
    servicio_id: "",
    fecha: new Date().toISOString().slice(0, 10),
    hora: "",
    cliente_nombre: "",
  });

  const nombreDia = useMemo(() => {
    const d = new Date(form.fecha + "T00:00:00");
    return ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][d.getDay()];
  }, [form.fecha]);

  useEffect(() => {
    (async () => {
      try {
        setError("");
        // 1) validar código
        const empRes = await api.get(`/emprendedores/by-codigo/${encodeURIComponent(code)}`);
        setEmp(empRes.data);

        // 2) traer datasets por código (mock devuelve lo mismo que /mis)
        const [srvRes, horRes] = await Promise.all([
          api.get(`/servicios/de/${encodeURIComponent(code)}`),
          api.get(`/horarios/de/${encodeURIComponent(code)}`),
        ]);
        setServicios(Array.isArray(srvRes.data) ? srvRes.data : []);
        setHorarios(Array.isArray(horRes.data) ? horRes.data : []);

        // 3) turnos próximos (formato YYYY-MM-DD para evitar 400s)
        const desde = new Date().toISOString().slice(0, 10);
        const hasta = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
        const turRes = await api.get(`/turnos/de/${encodeURIComponent(code)}?desde=${desde}&hasta=${hasta}`);
        setTurnos(Array.isArray(turRes.data) ? turRes.data : []);
      } catch (e) {
        console.error("Reservar init error:", e);
        setError(e?.response?.data?.detail || "No se pudo cargar el emprendedor/servicios.");
      }
    })();
  }, [code]);

  const duracionSel = useMemo(() => {
    const s = servicios.find((x) => x.id === Number(form.servicio_id));
    return s?.duracion_min || 30;
  }, [form.servicio_id, servicios]);

  const rangos = useMemo(
    () => horarios.filter((h) => h.dia === nombreDia),
    [horarios, nombreDia]
  );

  const slots = useMemo(() => {
    if (!rangos.length || !duracionSel) return [];
    const out = [];
    for (const r of rangos) {
      let t = r.desde;
      while (true) {
        const fin = addMinutes(t, duracionSel);
        if (fin > r.hasta) break;
        out.push(t);
        t = addMinutes(t, duracionSel);
        if (t >= r.hasta) break;
      }
    }
    return out;
  }, [rangos, duracionSel]);

  const turnosDeLaFecha = useMemo(
    () => turnos.filter((t) => sameDayISO(t.desde, form.fecha)),
    [turnos, form.fecha]
  );

  const slotOcupado = (hhmm) => {
    const start = new Date(`${form.fecha}T${hhmm}:00`);
    const end = new Date(start.getTime() + duracionSel * 60000);
    return turnosDeLaFecha.some((t) => {
      const a = new Date(t.desde);
      const b = new Date(t.hasta);
      return start < b && a < end;
    });
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setOk("");
    setError("");
    setForm((p) => ({ ...p, [name]: value }));
    if (name === "fecha" || name === "servicio_id") {
      setForm((p) => ({ ...p, hora: "" }));
    }
  };

  const reservar = async (e) => {
    e.preventDefault();
    setOk(""); setError("");

    if (!form.servicio_id || !form.fecha || !form.hora) {
      setError("Completá servicio, fecha y hora.");
      return;
    }
    if (!form.cliente_nombre.trim()) {
      setError("Ingresá tu nombre.");
      return;
    }
    if (!slots.includes(form.hora) || slotOcupado(form.hora)) {
      setError("Ese horario no está disponible. Elegí otro.");
      return;
    }

    try {
      const iso = new Date(`${form.fecha}T${form.hora}:00`).toISOString();
      await api.post("/turnos", {
        servicio_id: Number(form.servicio_id),
        datetime: iso,
        cliente_nombre: form.cliente_nombre.trim(),
      });

      setOk("¡Listo! Tu turno fue reservado.");

      // refrescar turnos del emprendedor (por código)
      const desde = new Date().toISOString().slice(0, 10);
      const hasta = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
      const turRes = await api.get(`/turnos/de/${encodeURIComponent(code)}?desde=${desde}&hasta=${hasta}`);
      setTurnos(Array.isArray(turRes.data) ? turRes.data : []);

      // limpiar hora
      setForm((p) => ({ ...p, hora: "" }));
    } catch (e2) {
      console.error("Reservar POST /turnos error:", e2);
      setError(e2?.response?.data?.detail || "No se pudo reservar. Probá con otro horario.");
    }
  };

  return (
    <div className="py-8">
      <div className="mx-auto w-full max-w-5xl px-4 lg:px-6 space-y-4">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-400 p-5 text-white shadow">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">
                {emp?.nombre || "Emprendimiento"}
              </h1>
              <p className="text-sm opacity-90">
                Reservá tu turno con {emp?.nombre || "el emprendedor"}.
              </p>
            </div>
            <div className="text-xs bg-white/10 rounded-full px-3 py-1">
              Código: <b>{code}</b>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3">{error}</div>
        )}
        {ok && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3">{ok}</div>
        )}

        <form onSubmit={reservar} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm grid gap-4">
          <div className="grid md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-slate-700">Servicio</span>
              <select
                name="servicio_id"
                value={form.servicio_id}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">— Elegir —</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} ({money.format(Number(s.precio) || 0)})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm text-slate-700">Tu nombre</span>
              <input
                name="cliente_nombre"
                value={form.cliente_nombre}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nombre y apellido"
                required
              />
            </label>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm text-slate-700">Fecha</span>
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm text-slate-700">Horario</span>
              <div className="mt-1">
                {!form.servicio_id ? (
                  <div className="text-xs text-slate-500">Elegí un servicio para ver horarios.</div>
                ) : slots.length === 0 ? (
                  <div className="text-xs text-slate-500">Sin horarios disponibles para este día.</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {slots.map((hhmm) => {
                      const ocupado = slotOcupado(hhmm);
                      const activo = form.hora === hhmm;
                      return (
                        <button
                          key={hhmm}
                          type="button"
                          disabled={ocupado}
                          onClick={() => setForm((p) => ({ ...p, hora: hhmm }))}
                          className={[
                            "rounded-lg px-2 py-2 text-sm font-medium border transition",
                            ocupado
                              ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                              : activo
                              ? "border-sky-400 bg-sky-50 text-sky-800 ring-1 ring-sky-300"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                          ].join(" ")}
                          title={ocupado ? "Ocupado" : "Disponible"}
                        >
                          {hhmm}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-sky-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-sky-700"
            >
              Reservar turno
            </button>
            <div className="text-xs text-slate-500 self-center">
              {form.hora ? `Seleccionado: ${form.hora} (${duracionSel} min)` : "Elegí un horario"}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
