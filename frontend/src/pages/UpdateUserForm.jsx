// src/pages/EmprendedorForm.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";

export default function EmprendedorForm() {
  const [loading, setLoading] = useState(true);
  const [activando, setActivando] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [emprendedor, setEmprendedor] = useState(null); // objeto si está activo, null si no
  const [activo, setActivo] = useState(false);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("turnate_token") || ""}`,
  });

  const fetchEstado = async () => {
    setErr("");
    setOk("");
    try {
      const { data } = await api.get("/emprendedores/mi", { headers: authHeaders() });
      setEmprendedor(data || {});
      setActivo(true);
    } catch (e) {
      // Si no está activo, tu back devuelve 401
      if (e?.response?.status === 401) {
        setEmprendedor(null);
        setActivo(false);
      } else {
        setErr(e?.response?.data?.detail || e.message || "Error consultando estado");
      }
    }
  };

  const activar = async () => {
    setActivando(true);
    setErr("");
    setOk("");
    try {
      await api.post("/emprendedores/activar", null, { headers: authHeaders() });
      setOk("¡Listo! Emprendedor activado.");
      await fetchEstado();
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "No se pudo activar");
    } finally {
      setActivando(false);
    }
  };

  useEffect(() => {
    // Asegura el Authorization por si algún componente usa axios directo
    const t = localStorage.getItem("turnate_token");
    if (t) {
      api.defaults.headers.common.Authorization = `Bearer ${t}`;
      axios.defaults.headers.common.Authorization = `Bearer ${t}`;
    }
    (async () => {
      setLoading(true);
      await fetchEstado();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Emprendedor</h1>
        <p className="text-slate-600">Activá tu cuenta de emprendedor para poder gestionar servicios, horarios y turnos.</p>
      </div>

      {loading ? (
        <div className="text-slate-500">Cargando…</div>
      ) : (
        <div className="rounded-xl border bg-white">
          <div className="p-5 border-b">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Estado</div>
                <div className={`text-lg font-semibold ${activo ? "text-emerald-600" : "text-slate-700"}`}>
                  {activo ? "Activo" : "Inactivo"}
                </div>
              </div>

              {!activo && (
                <button
                  type="button"
                  onClick={activar}
                  disabled={activando}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {activando ? "Activando…" : "Activar emprendedor"}
                </button>
              )}
            </div>

            {!!ok && (
              <div className="mt-4 rounded-lg bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">
                {ok}
              </div>
            )}
            {!!err && (
              <div className="mt-4 rounded-lg bg-rose-50 text-rose-700 px-3 py-2 text-sm">
                {err}
              </div>
            )}
          </div>

          {activo && (
            <div className="p-5 grid gap-4">
              <div className="text-sm text-slate-600">
                Tu cuenta de emprendedor ya está habilitada. Ahora podés:
              </div>
              <ul className="list-disc pl-5 text-sm text-slate-700">
                <li>Crear/editar <strong>Servicios</strong> en la pantalla “Turnos”.</li>
                <li>Configurar <strong>Horarios</strong> de atención.</li>
                <li>Ver tus <strong>Turnos</strong> y estadísticas.</li>
              </ul>
              {emprendedor && (
                <div className="mt-2 text-xs text-slate-500">
                  ID Emprendedor: <code>{emprendedor.id ?? "—"}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
