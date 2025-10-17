// src/utils/buildTurnoPayload.js
/**
 * Genera un payload compatible con distintas variantes de back,
 * asegurando que el nombre del cliente quede persistido.
 */
export function buildTurnoPayload({
  codigo,            // string: código público del emprendedor (/reservar/:codigo)
  emprendedor_id,    // opcional si tu API lo acepta
  servicio,          // { id, nombre, precio, duracion_minutos? }
  inicio,            // Date o ISO string
  fin,               // Date o ISO string
  clienteNombre,     // string
  clienteTelefono,   // string (opcional)
  estado = "confirmado",
  notas = null,
}) {
  const servicio_id =
    Number(servicio?.id) ||
    Number(servicio?.servicio_id) ||
    null;

  const nombre = (clienteNombre || "").trim();
  const tel = (clienteTelefono || "").trim() || null;

  const payload = {
    // Identificador del emprendedor (al menos uno requerido en muchos backends)
    emprendedor_codigo: codigo || undefined,
    emprendedor_id: emprendedor_id || undefined,

    // Servicio + horario
    servicio_id,
    inicio: new Date(inicio).toISOString(),
    fin: new Date(fin).toISOString(),
    estado,
    notas,

    // TODAS las variantes de cliente para no perder el nombre en ningún caso
    cliente_nombre: nombre,
    cliente_telefono: tel,
    cliente: { nombre, telefono: tel },
    nombre_cliente: nombre,
    telefono_cliente: tel,
  };

  // Limpio undefined (por prolijidad)
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  return payload;
}
