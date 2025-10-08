// src/components/CodigoShareCard.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";

export default function CodigoShareCard({ showRegenerate = false, title = "Código para compartir" }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const { data: emp } = await api.get("/emprendedores/mi");
      setCode(emp?.codigo_cliente || "");
    } catch (e) {
      setCode("");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function generar(regenerar = false) {
    try {
      setMsg("");
      const { data } = await api.post("/emprendedores/generar-codigo", { regenerar });
      setCode(data?.codigo || "");
      setMsg(regenerar ? "Código regenerado." : "Código generado.");
      setTimeout(() => setMsg(""), 1800);
    } catch (e) {
      setMsg("No se pudo generar el código.");
      setTimeout(() => setMsg(""), 2000);
    }
  }

  async function copiar() {
    if (!code) return;
    await navigator.clipboard.writeText(`${location.origin}/reservar/${code}`);
    setMsg("Copiado al portapapeles");
    setTimeout(() => setMsg(""), 1600);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          <div className="text-xs text-slate-500">Compartilo con tus clientes para que reserven online.</div>

          {code ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="font-mono text-slate-800 tracking-widest">{code}</span>
              <span className="text-slate-400">·</span>
              <Link
                to={`/reservar/${code}`}
                target="_blank"
                className="text-sky-700 text-sm font-medium hover:underline"
              >
                Abrir página pública
              </Link>
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-500">Aún no generaste un código.</div>
          )}

          {!!msg && <div className="mt-1 text-xs text-emerald-700">{msg}</div>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!code && (
            <button
              onClick={() => generar(false)}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 text-white px-4 py-2.5 text-sm font-semibold shadow hover:brightness-110"
            >
              Generar código
            </button>
          )}

          {code && (
            <>
              <button
                onClick={copiar}
                className="rounded-xl border border-slate-300 bg-white text-slate-700 px-4 py-2.5 text-sm font-semibold"
              >
                Copiar link
              </button>

              {showRegenerate && (
                <button
                  onClick={() => {
                    if (confirm("¿Regenerar el código? El anterior dejará de ser válido.")) {
                      generar(true);
                    }
                  }}
                  className="rounded-xl bg-rose-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-rose-700"
                >
                  Regenerar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
