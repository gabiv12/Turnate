import React from "react";

const valores = [
  { titulo: "Simpleza", desc: "Diseñamos para que reservar y gestionar turnos sea tan fácil como un click." },
  { titulo: "Transparencia", desc: "Comunicación clara: horarios, políticas y disponibilidad a la vista." },
  { titulo: "Confiabilidad", desc: "Infraestructura estable para que tus turnos no fallen cuando más los necesitás." },
  { titulo: "Crecimiento", desc: "Ayudamos a que tu emprendimiento escale con herramientas pensadas para vos." },
];

const equipo = [
  { nombre: "Turnate-Team.", rol: "Fundador/a & Producto", bio: "Impulsa la visión de una turnera simple para emprendedores y clientes." },
  { nombre: "Equipo Tech", rol: "Backend & Frontend", bio: "Construimos una base sólida en FastAPI y React para crecer sin fricción." },
  { nombre: "UX/Soporte", rol: "Experiencia de Usuario", bio: "Escuchamos a los usuarios y mejoramos el flujo de reserva día a día." },
];

const hitos = [
  { fecha: "2025", titulo: "Lanzamiento beta", desc: "Primeros clientes gestionando turnos y agenda diaria." },
  { fecha: "2025 Q4", titulo: "Modo público por código", desc: "Los clientes reservan viendo disponibilidad en tiempo real." },
  { fecha: "Próximamente", titulo: "Pagos y recordatorios", desc: "Confirmaciones automáticas, avisos por WhatsApp/Email y más." },
];

function Avatar({ nombre }) {
  const iniciales = nombre.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div aria-hidden className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-white grid place-items-center font-semibold">
      {iniciales}
    </div>
  );
}

export default function Nosotros() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        {/* Hero con historia */}
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50 via-sky-50 to-white" />
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">Nuestra historia</span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Hacemos fácil <span className="text-indigo-600">reservar turnos</span>
              </h1>
              <p className="mt-4 text-slate-600 text-lg">
                Somos un grupo de estudiantes de la carrera de Desarrollador de Software en el Instituto Mantovani, ubicado en Sáenz Peña, Chaco.
                A lo largo de nuestra formación identificamos una necesidad común: la dificultad que enfrentan las personas para gestionar turnos con profesionales de diversos rubros.
              </p>
              <p className="mt-4 text-slate-600 text-lg">
                Conscientes de este desafío, decidimos crear <strong>Turnate</strong>, una plataforma diseñada para optimizar la gestión de turnos y permitir una reserva ágil y accesible desde cualquier dispositivo.
                Nuestro objetivo es ofrecer una solución que mejore la experiencia tanto de los profesionales como de los usuarios, eliminando las barreras que hacen que el proceso de sacar un turno sea engorroso y poco eficiente.
              </p>
              <p className="mt-4 text-slate-600 text-lg">
                Este proyecto refleja nuestro compromiso por aportar valor a la sociedad, utilizando la tecnología para resolver problemas cotidianos.
                Con <strong>Turnate</strong>, buscamos facilitar la vida de miles de personas, haciéndoles más sencillo acceder a los servicios que necesitan.
              </p>
            </div>
          </div>
        </section>

        {/* Métricas */}
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <div className="grid grid-cols-1 gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-3xl font-semibold text-slate-900">+1.2k</p>
              <p className="text-sm text-slate-500">Turnos coordinados</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-semibold text-slate-900">+120</p>
              <p className="text-sm text-slate-500">Emprendimientos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-semibold text-slate-900">98%</p>
              <p className="text-sm text-slate-500">Satisfacción</p>
            </div>
          </div>
        </section>

        {/* Misión & Visión */}
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Nuestra misión</h2>
              <p className="mt-2 text-slate-600">Potenciar a los emprendedores con una turnera digital rápida y flexible que reduzca ausencias, evite superposiciones y ahorre tiempo en la coordinación diaria.</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Nuestra visión</h2>
              <p className="mt-2 text-slate-600">Ser la herramienta de referencia en LatAm para reservas de servicios, con foco en usabilidad, estabilidad y crecimiento.</p>
            </div>
          </div>
        </section>

        {/* Valores */}
        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="text-2xl font-semibold text-slate-900">Nuestros valores</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valores.map((v) => (
              <div key={v.titulo} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-base font-semibold text-slate-900">{v.titulo}</h3>
                <p className="mt-2 text-sm text-slate-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Equipo */}
        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="text-2xl font-semibold text-slate-900">Equipo</h2>
          <p className="mt-2 text-slate-600 max-w-2xl">Somos un equipo chico y ágil. Probamos, medimos y mejoramos en ciclos cortos para darte resultados reales.</p>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {equipo.map((p) => (
              <article key={p.nombre} className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  <Avatar nombre={p.nombre} />
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700">{p.nombre}</h3>
                    <p className="text-sm text-slate-500">{p.rol}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{p.bio}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Historia / Timeline */}
        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="text-2xl font-semibold text-slate-900">Cómo llegamos hasta acá</h2>
          <ol className="mt-6 space-y-6 border-l border-slate-200 pl-6">
            {hitos.map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-2 top-1.5 h-3 w-3 rounded-full bg-indigo-600" />
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">{h.fecha}</p>
                  <p className="mt-1 font-semibold text-slate-900">{h.titulo}</p>
                  <p className="mt-1 text-sm text-slate-600">{h.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="text-2xl font-semibold text-slate-900">Preguntas frecuentes</h2>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <details className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <summary className="cursor-pointer select-none font-medium text-slate-900">¿Cómo funciona el código público para que mis clientes reserven?</summary>
              <p className="mt-2 text-sm text-slate-600">Compartís tu enlace con código. Tus clientes ven disponible/ocupado en tiempo real y solicitan un turno. Podés confirmar, editar o cancelar desde tu panel.</p>
            </details>
            <details className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <summary className="cursor-pointer select-none font-medium text-slate-900">¿Puedo limitar la cantidad de reservas por cliente?</summary>
              <p className="mt-2 text-sm text-slate-600">Sí, cada cliente puede tener 1 reserva activa por servicio/emprendedor. Una vez que el turno pasa, puede volver a reservar.</p>
            </details>
            <details className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <summary className="cursor-pointer select-none font-medium text-slate-900">¿Necesito instalar algo?</summary>
              <p className="mt-2 text-sm text-slate-600">No. Todo se usa desde el navegador. Si querés, más adelante sumamos recordatorios por WhatsApp/Email.</p>
            </details>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-sky-500 p-8 text-white shadow-sm">
            <h2 className="text-2xl font-semibold">¿Listo para ordenar tu agenda?</h2>
            <p className="mt-1 text-white/90">Generá tu código público y compartilo con tus clientes hoy mismo.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href="/emprendedor" className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100">Ir al panel</a>
              <a href="/reservar" className="inline-flex items-center justify-center rounded-xl ring-1 ring-inset ring-white/70 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Probar como cliente</a>
            </div>
          </div>
        </section>
      </div>      
    </main>
  );
}
