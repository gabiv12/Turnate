import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

const SAFE_REGEX = /[A-HJ-NP-Z2-9]/g;
const SAFE_PATTERN = "^[A-HJ-NP-Z2-9]{4,10}$";

export default function IngresarCodigo() {
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const q = (searchParams.get("code") || "").toUpperCase();
    if (q) setCodigo(q);
  }, [searchParams]);

  const sanitized = useMemo(() => (codigo.match(SAFE_REGEX) || []).join(""), [codigo]);
  const valido = useMemo(() => new RegExp(SAFE_PATTERN).test(sanitized), [sanitized]);

  const buscar = async () => {
    setMensaje("");
    if (!valido) {
      setMensaje("Ingresá un código válido (4 a 10 caracteres).");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/emprendedores/by-codigo/${encodeURIComponent(sanitized)}`);
      if (data?.id) {
        navigate(`/reservar/${sanitized}`, { replace: true });
      } else {
        setMensaje("El código ingresado no corresponde a ningún emprendedor.");
      }
    } catch (err) {
      console.error("by-codigo error:", err);
      setMensaje(err?.response?.data?.detail || "El código ingresado no corresponde a ningún emprendedor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-blue-600 to-cyan-400 flex items-center justify-center p-4">
      <div className="w-full max-w-xl px-6">
        <div className="rounded-2xl p-[1px] bg-white/30 shadow-2xl">
          <div className="rounded-2xl bg-white p-6 md:p-8">
            <h1 className="text-2xl font-bold text-slate-800 text-center">
              Ingresá el código del emprendedor
            </h1>

            <div className="mt-6 space-y-3">
              <input
                type="text"
                pattern={SAFE_PATTERN}
                value={codigo}
                onChange={(e) =>
                  setCodigo((e.target.value || "").toUpperCase())
                }
                placeholder="Ej.: A7B9C2"
                className="w-full border rounded-xl px-4 py-3 text-lg tracking-widest text-center"
              />
              <button
                disabled={loading || !valido}
                onClick={buscar}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
              >
                {loading ? "Buscando..." : "Buscar"}
              </button>

              {!!mensaje && (
                <div className="text-sm text-red-600 text-center mt-2">
                  {mensaje}
                </div>
              )}

              <div className="mt-2 text-xs text-gray-500">
                Código (normalizado):{" "}
                <b className="text-gray-700">{sanitized || "—"}</b>
              </div>

              <p className="mt-4 text-xs text-center text-gray-500">
                ¿No tenés un código? Pedíselo al emprendedor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
