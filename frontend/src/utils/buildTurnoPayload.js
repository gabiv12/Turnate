// src/utils/buildTurnoPayload.js
export default function buildTurnoPayload({ servicio, slot, cliente, emprendedor }) {
  const inicio = slot?.inicio || slot?.start;
  const fin =
    slot?.fin ||
    slot?.end ||
    new Date(new Date(inicio).getTime() + ((servicio?.duracion_minutos || 60) * 60000));

  return {
    servicio_id: Number(servicio?.id),
    inicio: new Date(inicio).toISOString(),
    fin: new Date(fin).toISOString(),
    estado: "confirmado",

    // 👇 claves que el backend usa realmente
    cliente_nombre: (cliente?.nombre || "").trim() || null,
    cliente_contacto: (cliente?.telefono || cliente?.contacto || "").trim() || null,
    precio_aplicado: Number(servicio?.precio) || null,

    // si tu API acepta cualquiera de los dos, mandá ambos por seguridad:
    emprendedor_id: emprendedor?.id || null,
    emprendedor_codigo: emprendedor?.codigo_cliente || emprendedor?.codigo || null,

    notas: cliente?.notas || null,
  };
}
