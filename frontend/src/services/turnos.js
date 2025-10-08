// src/services/turnos.js
import api from "./api";

export async function getMisTurnos({ desde, hasta } = {}) {
  const { data } = await api.get("/turnos/mis", { params: { desde, hasta } });
  return Array.isArray(data) ? data : [];
}

export async function crearTurno(payload) {
  const { data } = await api.post("/turnos", payload);
  return data;
}

export async function actualizarTurno(id, payload) {
  const { data } = await api.patch(`/turnos/${id}`, payload);
  return data;
}

export async function eliminarTurno(id) {
  await api.delete(`/turnos/${id}`);
  return true;
}
