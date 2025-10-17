// src/pages/TurnosAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../services/api"; // ← ajustá si tu api está en otro lado

function fmtFechaHora(dt) {
  if (!dt) return "—";
  // soporta "YYYY-MM-DD HH:MM", ISO, etc.
  const s = String(dt);
  if (s.includes("T")) {
    // ISO
    const [d, t] = s.split("T");
    return `${d} ${t?.slice(0,5) || ""}`.trim();
  }
  return s.slice(0,16); // fallback
}

export default function TurnosAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [filtro, setFiltro] = useState("todos"); // todos | hoy | pendientes

  const normalize = (t) => {
    const fechaRaw =
      t.fecha_hora ||
      t.fechaHora ||
      t.fecha_inicio ||
      t.fecha ||
      t.inicio ||
      t.start ||
      t.datetime;
    const fecha = fmtFechaHora(fechaRaw);

    const estado = (t.estado || t.status || "pendiente").toLowerCase();
    const servicio =
      t.servicio?.nombre || t.servicio_nombre || t.servicio || "—";
    const cliente =
      t.cliente?.nombre ||
      t.nombre_cliente ||
      t.cliente_nombre ||
      t.usuario?.nombre ||
      t.usuario?.username ||
      t.nombre ||
      "—";
    const telefono =
      t.cliente?.telefono ||
      t.telefono ||
      t.usuario?.telefono ||
      t.cliente_telefono ||
      "";

    return {
      id: t.id,
      fecha,
      estado,
      servicio,
      cliente,
      telefono,
    };
  };

  async function tryChain(requests) {
    let lastErr;
    for (const fn of requests) {
      try { return await fn(); } catch (e) { lastErr = e; }
    }
    throw lastErr;
  }

  async function load() {
    setLoading(true);
    setErr(""); setOk("");
    try {
      let data;
      try {
        const r = await api.get("/turnos/mis");
        data = Array.isArray(r.data) ? r.data : r.data?.items || [];
      } catch {
        const r2 = await api.get("/turnos");
        data = Array.isArray(r2.data) ? r2.data : r2.data?.items || [];
      }
      setItems(data.map(normalize));
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          (e?.response?.status === 401
            ? "Sesión expirada. Iniciá sesión nuevamente."
            : "No se pudieron cargar los turnos.")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtrados = useMemo(() => {
    const now = new Date().toISOString().slice(0,10);
    return items.filter((t) => {
      if (filtro === "hoy") return t.fecha.startsWith(now);
      if (filtro === "pendientes") return t.estado === "pendiente";
      return true;
    });
  }, [items, filtro]);

  async function cancelar(id) {
    if (!confirm("¿Cancelar turno?")) return;
    setErr(""); setOk("");
    try {
      await tryChain([
        () => api.post(`/turnos/${id}/cancelar`),
        () => api.patch(`/turnos/${id}`, { estado: "cancelado" }),
        () => api.put(`/turnos/cancelar/${id}`),
      ]);
      setOk("Turno cancelado.");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "No se pudo cancelar el turno.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-400 p-5 text-white shadow">
        <h1 className="text-2xl font-semibold">Turnos</h1>
        <p className="text-sm opacity-90">Gestioná tus reservas. Podés cancelar turnos pendientes.</p>
      </div>

      {/* Filtros simples */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltro("todos")}
          className={`rounded-full px-3 py-1.5 text-sm border ${filtro==="todos" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-300"}`}
        >
          Todos
        </button>
        <button
          onClick={() => setFiltro("hoy")}
          className={`rounded-full px-3 py-1.5 text-sm border ${filtro==="hoy" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-300"}`}
        >
          Hoy
        </button>
        <button
          onClick={() => setFiltro("pendientes")}
          className={`rounded-full px-3 py-1.5 text-sm border ${filtro==="pendientes" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-300"}`}
        >
          Pendientes
        </button>
        <button onClick={load} className="ml-auto rounded-full px-3 py-1.5 text-sm border bg-white border-slate-300">
          Recargar
        </button>
      </div>

      {/* Mensajes */}
      {err && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3">{err}</div>}
      {ok && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3">{ok}</div>}

      {/* Tabla / Lista */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 md:p-4 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-6 text-slate-500">Cargando…</div>
        ) : filtrados.length === 0 ? (
          <div className="p-6 text-slate-500">No hay turnos.</div>
        ) : (
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 px-2">Fecha</th>
                <th className="py-2 px-2">Servicio</th>
                <th className="py-2 px-2">Cliente</th>
                <th className="py-2 px-2">Teléfono</th>
                <th className="py-2 px-2">Estado</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 px-2">{t.fecha}</td>
                  <td className="py-2 px-2">{t.servicio}</td>
                  <td className="py-2 px-2">{t.cliente}</td>
                  <td className="py-2 px-2">{t.telefono || "—"}</td>
                  <td className="py-2 px-2 capitalize">
                    <span className={
                      t.estado === "cancelado"
                        ? "text-rose-700"
                        : t.estado === "confirmado"
                        ? "text-emerald-700"
                        : "text-slate-700"
                    }>
                      {t.estado}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    {t.estado !== "cancelado" && (
                      <button
                        onClick={() => cancelar(t.id)}
                        className="rounded-lg px-3 py-1.5 text-sm bg-rose-600 text-white"
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
