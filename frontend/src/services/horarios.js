// src/services/horarios.js
import api from "./api";

export async function getMisHorarios() {
  const { data } = await api.get("/horarios/mis");
  return Array.isArray(data) ? data : [];
}

export async function crearHorario(payload) {
  const { data } = await api.post("/horarios", payload);
  return data;
}

export async function actualizarHorario(id, payload) {
  const { data } = await api.patch(`/horarios/${id}`, payload);
  return data;
}

export async function eliminarHorario(id) {
  await api.delete(`/horarios/${id}`);
  return true;
}
