// src/pages/Home.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef } from "react";

export default function Home() {
  const nav = useNavigate();

  // Rotamos entre tus imágenes disponibles, manteniendo tu foto
  const [heroSrc, setHeroSrc] = useState("/images/IMGHome.png");
  const handleImgError = () => {
    if (heroSrc === "/images/IMGHome.png") return setHeroSrc("/images/Turnate (1).png");
    if (heroSrc === "/images/Turnate (1).png") return setHeroSrc("/images/ImagenHome.png");
    const el = document.getElementById("home-hero-img");
    if (el) el.style.display = "none";
  };

  // Búsqueda por código
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  const goBuscar = () => {
    const c = (code || "").trim().toUpperCase();
    if (!c) {
      setErr("Ingresá un código para buscar la agenda.");
      inputRef.current?.focus();
      return;
    }
    setErr("");
    nav(`/reservar/${c}`); // Reservar.jsx auto-carga y no requiere login para ver
  };

  const onKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goBuscar();
    }
  };

  return (
    <main className="pt-20 md:pt-24 pb-10">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 space-y-10">

        {/* HERO con imagen y buscador de código */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* fondo suave */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-10 items-center">
            {/* Texto + buscador */}
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Organizá tus turnos <span className="text-sky-700">sin enredos</span>
              </h1>
              <p className="mt-3 text-slate-600 text-base md:text-lg">
                Turnate es una turnera simple: tus clientes ven horarios libres y reservan;
                vos administrás todo desde un calendario claro — sin mensajes de ida y vuelta.
              </p>

              {/* Input + botón (mínimo, iguales estilos) */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 min-w-[220px]">
                  <label className="sr-only" htmlFor="code">Código del emprendimiento</label>
                  <input
                    id="code"
                    ref={inputRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Pegá tu código (p. ej., BL8B7Q)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                  {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}
                </div>

                <button
                  onClick={goBuscar}
                  className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-white text-sm font-semibold shadow hover:bg-sky-700"
                >
                  Buscar agenda
                </button>
              </div>

              {/* Acciones secundarias */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-white text-sm font-semibold shadow hover:brightness-110"
                >
                  Crear cuenta gratis
                </Link>
              </div>
            </div>

            {/* Imagen */}
            <div className="relative h-56 sm:h-64 md:h-72 lg:h-80">
              <img
                id="home-hero-img"
                src={heroSrc}
                alt="Ilustración Turnate"
                className="absolute inset-0 h-full w-full object-contain md:object-cover rounded-2xl"
                onError={handleImgError}
                draggable="false"
              />
            </div>
          </div>
        </section>

        {/* Beneficios compactos (coherentes con Nosotros) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Calendario intuitivo" text="Vista por día, semana o mes. Arrastrá, editá y reordená." />
          <Card title="Servicios y horarios" text="Duraciones y bloques por día para evitar superposiciones." />
          <Card title="Reservas con código" text="Compartí tu código y recibí turnos sin atender el chat." />
        </section>

        {/* CTA secundaria */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
                Empezá gratis y activá tu plan cuando quieras
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Probá Turnate hoy y pasá a Emprendedor cuando lo necesites.
              </p>
            </div>
            <div className="flex gap-3 justify-center md:justify-start">
              <Link
                to="/registro"
                className="rounded-xl bg-sky-600 px-5 py-3 text-white text-sm font-semibold shadow hover:bg-sky-700"
              >
                Crear cuenta
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}

function Card({ title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-center">
      <h3 className="text-slate-900 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{text}</p>
    </div>
  );
}
