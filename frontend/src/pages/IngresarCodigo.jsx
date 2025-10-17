import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

// ✅ Acepta A-Z y 0-9 (sin filtrar I/O/1/0)
const SAFE_REGEX = /[A-Z0-9]/g;
const SAFE_PATTERN = "^[A-Z0-9]{4,10}$";

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
      setMensaje(
        err?.response?.data?.detail ||
          "El código ingresado no corresponde a ningún emprendedor."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-blue-600 to-cyan-400 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* LADO IZQUIERDO: imagen */}
          <div className="order-2 md:order-1">
            <div className="rounded-2xl overflow-hidden ring-1 ring-white/50 shadow-xl">
              <img
                src="/images/ReservaCodigo.png"
                alt="Reservá con tu código"
                className="w-full h-72 md:h-[420px] object-cover bg-white"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
          </div>

          {/* LADO DERECHO: tarjeta de búsqueda */}
          <div className="order-1 md:order-2">
            <div className="rounded-2xl p-[1px] bg-white/30 shadow-2xl">
              <div className="rounded-2xl bg-white p-6 md:p-8">
                <h1 className="text-2xl font-bold text-slate-800">
                  Ingresá el código del emprendedor
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  El código es único. Te lleva directo a la agenda pública para reservar.
                </p>

                <div className="mt-6 space-y-3">
                  <input
                    type="text"
                    pattern={SAFE_PATTERN}
                    value={codigo}
                    onChange={(e) => setCodigo((e.target.value || "").toUpperCase())}
                    placeholder="Ej.: ABC123"
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
                    <div className="text-sm text-red-600 text-center mt-1">
                      {mensaje}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Código (normalizado): <b className="text-gray-700">{sanitized || "—"}</b>
                  </div>

                  <p className="mt-4 text-xs text-center text-gray-500">
                    ¿No tenés un código? Pedíselo al emprendedor.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* /tarjeta */}
        </div>
      </div>
    </div>
  );
}
