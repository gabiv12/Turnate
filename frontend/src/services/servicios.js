// src/services/servicios.js
import api from "./api";

export async function getMisServicios() {
  const { data } = await api.get("/servicios/mis");
  return Array.isArray(data) ? data : [];
}

export async function crearServicio(payload) {
  const { data } = await api.post("/servicios", payload);
  return data;
}

export async function actualizarServicio(id, payload) {
  const { data } = await api.patch(`/servicios/${id}`, payload);
  return data;
}

export async function eliminarServicio(id) {
  await api.delete(`/servicios/${id}`);
  return true;
}
