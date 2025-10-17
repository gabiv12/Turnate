// src/services/http.js
import axios from "axios";

// Base URL del back: usa .env si existe, si no localhost
const baseURL = import.meta?.env?.VITE_API_URL || "http://127.0.0.1:8000";

const http = axios.create({
  baseURL,
  timeout: 20000,
});

// Adjunta token si existe
http.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

// Manejo de errores con logging visible
http.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    console.error(`[HTTP ${status || "ERR"}]`, data || error?.message || error);
    return Promise.reject(error);
  }
);

export default http;
