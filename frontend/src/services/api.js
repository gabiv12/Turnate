// src/services/api.js
import axios from "axios";

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? "false").toLowerCase() === "true";

// Unificamos claves de token (compat con otros clientes)
const TOKEN_KEYS = ["accessToken", "turnate_token", "token", "access_token", "jwt"];

export function readToken() {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}
export function setToken(tok) {
  const clean = String(tok || "").replace(/^Bearer\s+/i, "");
  if (!clean) return clearToken();
  for (const k of TOKEN_KEYS) localStorage.setItem(k, clean);
}
export function clearToken() {
  for (const k of TOKEN_KEYS) localStorage.removeItem(k);
}

function redirectToLogin() {
  const isLogin = /^\/login/.test(window.location.pathname);
  if (isLogin) return;
  try { clearToken(); } catch {}
  const here = window.location.pathname + window.location.search + window.location.hash;
  const next = encodeURIComponent(here || "/");
  window.location.assign(`/login?next=${next}`);
}

// ===== Cliente real =====
function createReal() {
  const client = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((cfg) => {
    // Auth
    const tk = readToken();
    if (tk) cfg.headers.Authorization = `Bearer ${tk}`;

    // 🛡️ Hotfix horarios: forzar activo=true y normalizar horas en POST/PUT a /horarios
    try {
      const method = (cfg.method || "").toLowerCase();
      const url = String(cfg.url || "");
      const isHorarios = /\/horarios(\/|$)/.test(url);

      if (isHorarios && (method === "post" || method === "put")) {
        if (!cfg.data || typeof cfg.data !== "object") {
          cfg.data = {};
        }
        if (cfg.data.activo === undefined || cfg.data.activo === null) {
          cfg.data.activo = true;
        }

        const toHHMM = (v) => {
          if (!v) return v;
          if (v instanceof Date) return v.toTimeString().slice(0, 5); // "HH:mm"
          if (typeof v === "string") {
            const m = v.match(/^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
            if (m) return `${m[1]}:${m[2]}`;
            const d = new Date(v);
            if (!isNaN(d)) return d.toTimeString().slice(0, 5);
            return v;
          }
          return v;
        };

        if ("hora_desde" in cfg.data) cfg.data.hora_desde = toHHMM(cfg.data.hora_desde);
        if ("hora_hasta" in cfg.data) cfg.data.hora_hasta = toHHMM(cfg.data.hora_hasta);
        if ("desde" in cfg.data && !("hora_desde" in cfg.data)) {
          cfg.data.hora_desde = toHHMM(cfg.data.desde);
        }
        if ("hasta" in cfg.data && !("hora_hasta" in cfg.data)) {
          cfg.data.hora_hasta = toHHMM(cfg.data.hasta);
        }
      }
    } catch {
      // no romper request si el hotfix falla
    }

    return cfg;
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.response?.status === 401) {
        // Token inválido/expirado → limpiamos y redirigimos a login con retorno
        redirectToLogin();
      }
      return Promise.reject(err);
    }
  );

  return {
    get: (url, cfg) => client.get(url, cfg),
    post: (url, data, cfg) => client.post(url, data, cfg),
    put: (url, data, cfg) => client.put(url, data, cfg),
    patch: (url, data, cfg) => client.patch(url, data, cfg),
    delete: (url, cfg) => client.delete(url, cfg),
  };
}

// ===== Mock minimal (solo para desarrollo sin back) =====
const mockDB = { emprendedor: null };
const mock = {
  get: async (url) => {
    if (url === "/emprendedores/mi") {
      if (!mockDB.emprendedor) {
        const err = new Error("not found");
        err.response = { status: 404, data: { detail: "No sos emprendedor" } };
        throw err;
      }
      return { data: mockDB.emprendedor };
    }
    throw new Error(`MOCK GET no implementado: ${url}`);
  },
  post: async (url) => {
    if (url === "/emprendedores/activar") {
      const code = "ABC123";
      mockDB.emprendedor = {
        id: 1,
        usuario_id: 1,
        codigo_cliente: code,
        nombre: "",
        telefono_contacto: "",
        direccion: "",
        descripcion: "",
      };
      return { data: { detail: "Emprendedor activado", emprendedor: mockDB.emprendedor } };
    }
    throw new Error(`MOCK POST no implementado: ${url}`);
  },
  put: async (url, data) => {
    if (url === "/emprendedores/mi") {
      if (!mockDB.emprendedor) {
        const err = new Error("not found");
        err.response = { status: 404, data: { detail: "No sos emprendedor" } };
        throw err;
      }
      mockDB.emprendedor = { ...mockDB.emprendedor, ...data };
      return { data: mockDB.emprendedor };
    }
    throw new Error(`MOCK PUT no implementado: ${url}`);
  },
  patch: async () => {
    throw new Error("MOCK PATCH no implementado");
  },
  delete: async () => {
    throw new Error("MOCK DELETE no implementado");
  },
};

export const api = USE_MOCK ? mock : createReal();
export default api;
