// src/services/emprendedor.js
import api from "./api";

export async function getMiEmprendedor() {
  const { data } = await api.get("/emprendedores/mi");
  return data;
}

export async function activarEmprendedor() {
  const { data } = await api.post("/emprendedores/activar");
  return data;
}

export async function upsertEmprendedor(payload) {
  const { data } = await api.post("/emprendedores", payload);
  return data;
}
