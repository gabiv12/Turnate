// src/components/api.js
import axios from "axios";

export const TOKEN_KEY = "turnate_token";
const baseURL = import.meta?.env?.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL,
  withCredentials: false,
});

// Agrega Authorization si hay token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Logguea 401 para depurar
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      console.warn("[API 401] Token inválido/expirado");
    }
    return Promise.reject(err);
  }
);

export default api;
