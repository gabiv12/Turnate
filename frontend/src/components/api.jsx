// src/components/api.jsx
import axios from "axios";

const BASE_URL =
  import.meta?.env?.VITE_API_URL?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8000";

const TOKEN_KEYS = [
  "accessToken",
  "token",
  "jwt",
  "access",
  "access_token",
];

export function readToken() {
  for (const k of TOKEN_KEYS) {
    const v = (localStorage.getItem(k) || "").trim();
    if (v) return v.replace(/^Bearer\s+/i, "");
  }
  return "";
}

export function setToken(tok) {
  const clean = (tok || "").replace(/^Bearer\s+/i, "");
  if (!clean) {
    clearToken();
    return;
  }
  localStorage.setItem("accessToken", clean);
}

export function clearToken() {
  for (const k of TOKEN_KEYS) localStorage.removeItem(k);
}

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

// —— Request: inyecta SIEMPRE Authorization con lo último del storage
api.interceptors.request.use(
  (config) => {
    const t = readToken();
    if (t) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${t}`;
    } else {
      // por si quedó algo viejo
      if (config?.headers?.Authorization) {
        delete config.headers.Authorization;
      }
    }
    // Log útil para depurar
    // eslint-disable-next-line no-console
    console.log(
      `[API] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      config.headers?.Authorization ? "(Auth ON)" : "(Auth OFF)"
    );
    return config;
  },
  (error) => Promise.reject(error)
);

// —— Response: mensaje claro en 401
api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // eslint-disable-next-line no-console
      console.warn("[API 401] Token inválido/expirado");
    }
    return Promise.reject(error);
  }
);

export default api;
