import React from "react";

export default function Terminos() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-4xl bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Términos y Condiciones de Turnate
        </h1>

        <section className="space-y-4 text-slate-700 text-sm leading-relaxed">
          <p>
            <strong>1. Aceptación.</strong> Al acceder y utilizar Turnate
            (“la plataforma”), el usuario acepta estos Términos y Condiciones.
            Si no está de acuerdo, debe abstenerse de utilizar el servicio.
          </p>

          <p>
            <strong>2. Descripción del servicio.</strong> Turnate es una
            plataforma digital que permite a profesionales y emprendedores
            gestionar turnos y a usuarios reservar de forma ágil desde cualquier
            dispositivo.
          </p>

          <p>
            <strong>3. Registro de usuarios.</strong> Los profesionales deben
            registrarse con información veraz y actualizada. Los usuarios pueden
            reservar turnos sin necesidad de cuenta, mediante un código público.
          </p>

          <p>
            <strong>4. Uso adecuado.</strong> El usuario se compromete a: (a) no
            utilizar la plataforma para fines ilícitos; (b) no interferir con la
            disponibilidad ni la seguridad del sistema; (c) respetar las
            condiciones de cada profesional (cancelaciones, reprogramaciones,
            puntualidad y políticas vigentes).
          </p>

          <p>
            <strong>5. Intermediación y responsabilidad.</strong> Turnate actúa
            como intermediario tecnológico entre profesionales y usuarios. La
            responsabilidad por la prestación efectiva de los servicios recae
            exclusivamente en el profesional o emprendimiento que los ofrece.
            Turnate no se hace responsable por cancelaciones, demoras, calidad
            del servicio, o conflictos entre profesionales y usuarios.
          </p>

          <p>
            <strong>6. Privacidad y datos.</strong> El uso de datos personales
            se regula en nuestra{" "}
            <a href="/privacidad" className="text-indigo-600 hover:underline">
              Política de Privacidad
            </a>
            . Los usuarios aceptan que se recopile la información mínima
            necesaria para la gestión de turnos y el envío de notificaciones.
          </p>

          <p>
            <strong>7. Propiedad intelectual.</strong> El software, diseño,
            logotipos y contenidos de Turnate son de propiedad de sus
            titulares. Queda prohibida su copia, modificación o distribución sin
            autorización expresa.
          </p>

          <p>
            <strong>8. Disponibilidad del servicio.</strong> Procuramos
            mantener la plataforma operativa. No obstante, pueden existir
            interrupciones por mantenimiento o causas de fuerza mayor.
          </p>

          <p>
            <strong>9. Modificaciones.</strong> Turnate puede actualizar estos
            Términos en cualquier momento. Las modificaciones entrarán en
            vigencia a partir de su publicación en la plataforma.
          </p>

          <p>
            <strong>10. Legislación aplicable.</strong> Estos Términos se rigen
            por las leyes de la República Argentina. En caso de conflicto, la
            jurisdicción será la de los tribunales de la ciudad de Sáenz Peña,
            Chaco.
          </p>
        </section>
      </div>
    </main>
  );
}
