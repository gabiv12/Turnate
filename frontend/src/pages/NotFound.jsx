// src/pages/NotFound.jsx
export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto mt-16 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm text-center">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Página no encontrada</h1>
      <p className="text-slate-600 mb-4">La URL que buscás no existe.</p>
      <a href="/" className="inline-block rounded-xl bg-sky-600 text-white px-4 py-2.5 text-sm font-semibold">
        Volver al inicio
      </a>
    </div>
  );
}
