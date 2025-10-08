import React from "react";

export default function Privacidad() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-4xl bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Política de Privacidad de Turnate
        </h1>

        <section className="space-y-4 text-slate-700 text-sm leading-relaxed">
          <p>
            <strong>1. Introducción.</strong> En Turnate respetamos la
            privacidad de nuestros usuarios. Esta política explica cómo
            recopilamos, usamos y protegemos la información personal.
          </p>

          <p>
            <strong>2. Datos recopilados.</strong> (a) Información de registro
            de profesionales (nombre, email, teléfono, datos de negocio);
            (b) Información mínima de clientes al reservar (nombre y datos de
            contacto); (c) Datos técnicos básicos (IP, navegador, dispositivo).
          </p>

          <p>
            <strong>3. Finalidades del tratamiento.</strong> Utilizamos los
            datos para: (a) gestionar turnos y reservas; (b) enviar
            notificaciones y recordatorios; (c) mejorar la plataforma; (d) dar
            soporte al usuario y prevenir fraude o abuso.
          </p>

          <p>
            <strong>4. Bases legales.</strong> Tratamos datos en base al
            consentimiento del usuario, la ejecución del servicio solicitado y
            el interés legítimo de mejorar la operatividad de la plataforma.
          </p>

          <p>
            <strong>5. Cesión y terceros.</strong> No compartimos datos
            personales con terceros, salvo que: (a) sea necesario para brindar
            el servicio (por ejemplo, proveedores de mensajería); (b) lo exija
            la ley o una autoridad competente; (c) medie consentimiento del
            titular.
          </p>

          <p>
            <strong>6. Conservación.</strong> Conservamos los datos por el
            tiempo necesario para cumplir con las finalidades descriptas y
            obligaciones legales. Luego, se eliminan o se anonimizan.
          </p>

          <p>
            <strong>7. Seguridad.</strong> Implementamos medidas razonables de
            seguridad técnicas y organizativas para proteger la información; sin
            embargo, ningún sistema es 100% seguro.
          </p>

          <p>
            <strong>8. Derechos de los usuarios.</strong> Los usuarios pueden
            solicitar acceso, rectificación, actualización o eliminación de sus
            datos escribiendo a{" "}
            <a
              href="mailto:contacto@turnate.com"
              className="text-indigo-600 hover:underline"
            >
              contacto@turnate.com
            </a>
            . También pueden retirar su consentimiento cuando corresponda.
          </p>

          <p>
            <strong>9. Cookies.</strong> Podemos utilizar cookies necesarias
            para el funcionamiento del sitio y, opcionalmente, analíticas para
            mejorar la experiencia. El usuario puede configurar su navegador
            para bloquearlas o eliminarlas.
          </p>

          <p>
            <strong>10. Transferencias internacionales.</strong> Si se
            transfieren datos fuera de Argentina, adoptaremos salvaguardas
            adecuadas conforme a la normativa aplicable.
          </p>

          <p>
            <strong>11. Cambios en esta política.</strong> Esta política puede
            actualizarse; las modificaciones entrarán en vigor al ser
            publicadas en la plataforma.
          </p>

          <p>
            <strong>12. Contacto.</strong> Para consultas sobre privacidad,
            escribinos a{" "}
            <a
              href="mailto:contacto@turnate.com"
              className="text-indigo-600 hover:underline"
            >
              contacto@turnate.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
