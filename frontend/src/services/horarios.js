// src/services/horarios.js
import api from "./api";

/**
 * Devuelve [{ id, dia_semana, hora_desde:"HH:MM", hora_hasta:"HH:MM", intervalo_min, activo }]
 */
export async function getHorariosPublicByCodigo(codigo) {
  const { data } = await api.get(`/horarios/de/${encodeURIComponent(codigo)}`);
  if (!Array.isArray(data)) return [];
  return data.map((h) => ({
    id: Number(h.id),
    dia_semana: Number(h.dia_semana ?? 0),
    hora_desde: String(h.hora_desde || h.desde || "").slice(0, 5),
    hora_hasta: String(h.hora_hasta || h.hasta || "").slice(0, 5),
    intervalo_min: Number(h.intervalo_min || h.intervalo || 30),
    activo: h.activo !== false,
  }));
}

export default { getHorariosPublicByCodigo };
