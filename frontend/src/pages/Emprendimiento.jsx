// src/pages/Emprendimiento.jsx
import { useEffect, useState } from "react";
import EmprendedorForm from "./EmprendedorForm";
import api from "../services/api";

export default function Emprendimiento() {
  const [emp, setEmp] = useState(null);
  const [copyMsg, setCopyMsg] = useState("");
  const [sharing, setSharing] = useState(false);

  // Cargar mi emprendimiento (si existe)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api.get("/emprendedores/mi");
        if (mounted) setEmp(r?.data || null);
      } catch {
        if (mounted) setEmp(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const copy = async (txt) => {
    try {
      await navigator.clipboard.writeText(String(txt || ""));
      setCopyMsg("¡Copiado!");
      setTimeout(() => setCopyMsg(""), 1600);
    } catch {
      setCopyMsg("No se pudo copiar");
      setTimeout(() => setCopyMsg(""), 2000);
    }
  };

  const copyCode = () => copy(emp?.codigo_cliente);
  const copyLink = () =>
    copy(`${window.location.origin}/reservar/${encodeURIComponent(emp?.codigo_cliente || "")}`);

  const shareLink = async () => {
    const url = `${window.location.origin}/reservar/${encodeURIComponent(emp?.codigo_cliente || "")}`;
    if (!emp?.codigo_cliente) return;
    try {
      setSharing(true);
      if (navigator.share) {
        await navigator.share({
          title: "Agenda Turnate",
          text: "Reservá tu turno en mi agenda:",
          url,
        });
      } else {
        await copy(url);
      }
    } catch {
      // usuario canceló
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header original */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-400 p-5 md:p-6 text-white shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Emprendimiento</h1>
            <p className="text-sm md:text-base/relaxed opacity-90">
              Completá los datos de tu negocio. El público reserva con tu <b>código</b> o con tu <b>link</b>.
            </p>
          </div>
        </div>
      </div>

      {/* Estado + Código público (fondo suave) */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Estado */}
          <div>
            <div className="text-xs text-slate-500">Estado</div>
            <div className={`text-base font-semibold ${emp ? "text-emerald-600" : "text-slate-700"}`}>
              {emp ? "Activo" : "Inactivo"}
            </div>
            {!emp && (
              <p className="text-xs text-slate-500 mt-1">
                Activá tu plan desde{" "}
                <a href="/perfil" className="underline font-semibold text-sky-700">Perfil</a>{" "}
                para habilitar servicios, horarios y turnos.
              </p>
            )}
          </div>

          {/* Código + acciones */}
          <div className="w-full md:w-auto">
            <div className="text-xs text-slate-500 mb-1">Código público</div>
            <div className="flex flex-wrap items-center gap-2">
              <code
                className={`rounded-md bg-white/90 px-2 py-1 ring-1 ring-slate-200 tracking-widest text-slate-800 text-sm ${
                  copyMsg ? "animate-pulse" : ""
                }`}
              >
                {emp?.codigo_cliente || "—"}
              </code>

              <button
                type="button"
                onClick={copyCode}
                disabled={!emp?.codigo_cliente}
                className="rounded-lg border border-slate-300 bg-white/90 text-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-white disabled:opacity-50"
              >
                Copiar código
              </button>

              <a
                href={emp?.codigo_cliente ? `/reservar/${encodeURIComponent(emp.codigo_cliente)}` : "#"}
                onClick={(e) => { if (!emp?.codigo_cliente) e.preventDefault(); }}
                className="rounded-lg bg-sky-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-sky-700 disabled:opacity-50"
                title="Ver tu agenda pública"
              >
                Ver agenda
              </a>

              <button
                type="button"
                onClick={copyLink}
                disabled={!emp?.codigo_cliente}
                className="rounded-lg border border-slate-300 bg-white/90 text-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-white disabled:opacity-50"
                title="Copiar link público"
              >
                Copiar link
              </button>

              <button
                type="button"
                onClick={shareLink}
                disabled={!emp?.codigo_cliente || sharing}
                className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                title="Compartir link"
              >
                {sharing ? "Compartiendo…" : "Compartir"}
              </button>
            </div>

            {copyMsg && (
              <div className="mt-2 inline-block rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-1 text-xs">
                {copyMsg}
              </div>
            )}

            {emp?.codigo_cliente && (
              <p className="text-[11px] text-slate-500 mt-2">
                Tus clientes reservan en:{" "}
                <b>/reservar/<span className="tracking-widest">{emp.codigo_cliente}</span></b>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Formulario del emprendedor (datos) en fondo suave */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-[1px] p-4 md:p-6 shadow-sm">
        <EmprendedorForm />
      </div>

      {/* Ayuda corta */}
      <div className="text-xs text-slate-600">
        <b>¿Cómo se ve en público?</b> Cualquiera puede entrar a{" "}
        <code className="bg-slate-100 px-1 ring-1 ring-slate-200 rounded">/reservar/&lt;código&gt;</code>{" "}
        y ver tu agenda para sacar turno.
      </div>
    </div>
  );
}
