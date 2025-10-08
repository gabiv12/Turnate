// src/pages/Emprendimiento.jsx
import { Link } from "react-router-dom";
import EmprendedorForm from "./EmprendedorForm";
import CodigoShareCard from "../components/CodigoShareCard";

export default function Emprendimiento() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-400 p-5 md:p-6 text-white shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Emprendimiento
            </h1>
            <p className="text-sm md:text-base/relaxed opacity-90">
              Completá los datos de tu negocio. Después gestioná <b>Servicios</b> y <b>Horarios</b>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/servicios"
              className="rounded-xl bg-white text-sky-700 px-3 py-2 text-sm font-semibold ring-1 ring-white/0 hover:brightness-95"
            >
              Servicios
            </Link>
            <Link
              to="/horarios"
              className="rounded-xl bg-white text-sky-700 px-3 py-2 text-sm font-semibold ring-1 ring-white/0 hover:brightness-95"
            >
              Horarios
            </Link>
          </div>
        </div>
      </div>

      {/* Código para compartir (con regenerar) */}
      <CodigoShareCard showRegenerate title="Código para tus clientes" />

      {/* Formulario del emprendedor */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
        <EmprendedorForm />
      </div>
    </div>
  );
}
