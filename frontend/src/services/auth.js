// src/services/auth.js
import { api } from "./api";

export async function login(identifier, password) {
  const body = { identifier, username: identifier, password };
  const { data } = await api.post("/usuarios/login", body);
  const access_token = data.access_token || data.token;
  const user = data.user || data?.data?.user || null;

  if (!access_token || !user) {
    throw new Error("Respuesta de login inválida");
  }

  localStorage.setItem("turnate_user", JSON.stringify(user));
  localStorage.setItem("turnate_token", access_token);

  return { access_token, user };
}

export async function me() {
  const { data } = await api.get("/usuarios/me");
  return data;
}

export function logout() {
  localStorage.removeItem("turnate_user");
  localStorage.removeItem("turnate_token");
}
