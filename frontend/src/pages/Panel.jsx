// src/pages/Panel.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useUser } from "../context/UserContext";

export default function Panel() {
  const navigate = useNavigate();
  const { user, setSelectedEmpId } = useUser();

  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const r = await api.get("/emprendedores/mi");
        if (!alive) return;
        setEmp(r?.data ?? null);
      } catch (e) {
        if (!alive) return;
        const msg =
          e?.response?.data?.detail ||
          e?.message ||
          "No se pudo cargar tu emprendimiento.";
        setErr(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const entrarTurnos = () => {
    if (emp?.id) setSelectedEmpId(emp.id);
    navigate("/turnos");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-4 sm:px-6 py-5 text-white shadow">
        <h1 className="text-2xl font-semibold tracking-tight">Tu Panel</h1>
        <p className="text-sm/relaxed opacity-90">
          Gestioná servicios, horarios y turnos de tu emprendimiento.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6">
        {loading ? (
          <div className="text-slate-600">Cargando…</div>
        ) : err ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
            {err}
          </div>
        ) : !emp ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
            No encontramos tu emprendimiento todavía.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_auto]">
            <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    {emp.nombre || "Mi Emprendimiento"}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Código público:{" "}
                    <span className="font-mono text-slate-700">
                      {emp.codigo_cliente || "—"}
                    </span>
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Activo
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Link
                  to="/servicios"
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium hover:bg-slate-50 text-slate-700 text-center"
                  onClick={() => emp?.id && setSelectedEmpId(emp.id)}
                >
                  Servicios
                </Link>
                <Link
                  to="/horarios"
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium hover:bg-slate-50 text-slate-700 text-center"
                  onClick={() => emp?.id && setSelectedEmpId(emp.id)}
                >
                  Horarios
                </Link>
                <button
                  onClick={entrarTurnos}
                  className="rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Ir a Turnos
                </button>
              </div>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
                <div className="font-medium mb-1">Primeros pasos</div>
                <ul className="list-disc ms-5 space-y-1">
                  <li>Revisá tus <b>Servicios</b> y asignales duración.</li>
                  <li>Definí tus <b>Horarios</b> semanales/bloques.</li>
                  <li>Luego, administrá tus <b>Turnos</b>.</li>
                </ul>
              </div>
            </div>

            <aside className="rounded-2xl border border-slate-200 p-4 sm:p-5 h-fit">
              <div className="text-sm text-slate-500">Resumen</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3 text-center">
                  <div className="text-xs text-slate-500">Servicios</div>
                  <div className="text-xl font-semibold">{emp._stats?.servicios ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 text-center">
                  <div className="text-xs text-slate-500">Bloques horarios</div>
                  <div className="text-xl font-semibold">{emp._stats?.horarios ?? "—"}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {user?.username ? `Sesión: ${user.username}` : null}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
