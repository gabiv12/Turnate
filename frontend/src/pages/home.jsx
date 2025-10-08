// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { useState } from "react";

export default function Home() {
  // Intentamos con tu foto original; si no existe, caemos a otras que ya tenés.
  const [heroSrc, setHeroSrc] = useState("/images/IMGHome.png");

  const handleImgError = () => {
    if (heroSrc === "/images/Turnate (1).png") return setHeroSrc("/images/ImagenHome.png");
    if (heroSrc === "/images/ImagenHome.png") return setHeroSrc("/images/IMGHome.png");
    // última chance: ocultar si tampoco existe
    const el = document.getElementById("home-hero-img");
    if (el) el.style.display = "none";
  };

  return (
    // Empuja el contenido bajo el header fijo; padding contenido para no dejar “huecos”
    <main className="pt-20 md:pt-24 pb-8">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 space-y-8">

        {/* HERO con foto al costado */}
        <section className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8 items-center">
            {/* Texto */}
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-800 leading-tight">
                Gestioná tus turnos de forma simple y rápida
              </h1>
              <p className="mt-2 text-slate-600 text-sm md:text-base">
                Organizá tu agenda, configurá servicios y horarios, y compartí tu código
                para que tus clientes reserven online.
              </p>

              <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-white text-sm font-semibold shadow hover:brightness-110"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Crear cuenta
                </Link>
                <Link
                  to="/ingresar-codigo"
                  className="inline-flex items-center justify-center rounded-xl bg-white/0 px-5 py-3 text-sm font-semibold text-blue-700 hover:underline"
                >
                  Ingresar código de cliente
                </Link>
              </div>
            </div>

            {/* Foto */}
            <div className="relative h-52 sm:h-64 md:h-72 lg:h-80">
              <img
                id="home-hero-img"
                src={heroSrc}
                alt="Ilustración Turnate"
                className="absolute inset-0 h-full w-full object-contain md:object-cover rounded-xl"
                draggable="false"
                onError={handleImgError}
              />
            </div>
          </div>
        </section>

        {/* Beneficios compactos */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            title="Calendario intuitivo"
            text="Vista por día, semana o mes. Editá y mové turnos sin complicarte."
          />
          <Card
            title="Servicios y horarios"
            text="Definí duraciones y configurá bloques de atención por día."
          />
          <Card
            title="Reservas con código"
            text="Compartí tu código y tus clientes reservan desde el celular."
          />
        </section>

        {/* CTA secundaria equilibrada */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-semibold text-slate-800">
                Empezá gratis y activá tu plan cuando quieras
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Probá la plataforma y, cuando estés listo, suscribite como Emprendedor.
              </p>
            </div>
            <div className="flex gap-3 justify-center md:justify-start">
              <Link
                to="/registro"
                className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 px-5 py-3 text-white text-sm font-semibold shadow hover:brightness-110"
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
      <h3 className="text-slate-800 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{text}</p>
    </div>
  );
}
