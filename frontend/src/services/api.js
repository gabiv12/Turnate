// src/services/api.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const MOCK = true; // ⬅️ Dejalo true para probar sin backend
export const IS_MOCK = MOCK;

const LS = {
  DB: "turnate_mock_db",
  USER: "turnate_user",
  TOKEN: "turnate_token",
};

const sleep = (ms = 150) => new Promise((r) => setTimeout(r, ms));

/* ===========================
   DB helpers (robustos)
=========================== */
function seedDB() {
  return {
    emprendedor: {
      id: 1,
      nombre: "Mi Emprendimiento",
      codigo_cliente: "ABC123",
      is_active: true,
      is_active: false,
      _stats: { servicios: 2, horarios: 3 },
    },
    servicios: [
      { id: 1, nombre: "Corte de pelo", duracion_min: 30, precio: 5000 },
      { id: 2, nombre: "Manicura", duracion_min: 45, precio: 7000 },
    ],
    horarios: [
      { id: 101, dia: "Lunes", desde: "09:00", hasta: "18:00" },
      { id: 102, dia: "Martes", desde: "09:00", hasta: "18:00" },
      { id: 103, dia: "Miércoles", desde: "09:00", hasta: "18:00" },
    ],
    turnos: [],
    token: "mock-token-123",
    seq: 500,
  };
}
function loadDB() {
  try {
    const raw = localStorage.getItem(LS.DB);
    const db = raw ? JSON.parse(raw) : seedDB();
    return ensureDB(db);
  } catch {
    return ensureDB(seedDB());
  }
}
function saveDB(db) {
  localStorage.setItem(LS.DB, JSON.stringify(db));
}
function ensureDB(db) {
  // estructuras base
  db = db || {};
  db.emprendedor = db.emprendedor || {
    id: 1,
    nombre: "Mi Emprendimiento",
    codigo_cliente: "ABC123",
    is_active: true,
    _stats: { servicios: 0, horarios: 0 },
  };
  db.emprendedor._stats = db.emprendedor._stats || { servicios: 0, horarios: 0 };

  db.servicios = Array.isArray(db.servicios) ? db.servicios : [];
  db.horarios = Array.isArray(db.horarios) ? db.horarios : [];
  db.turnos = Array.isArray(db.turnos) ? db.turnos : [];
  db.token = db.token || "mock-token-123";

  // secuencia segura
  if (!db.seq || typeof db.seq !== "number") {
    const maxS = db.servicios.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
    const maxH = db.horarios.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
    const maxT = db.turnos.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
    db.seq = Math.max(100, maxS, maxH, maxT) + 1;
  }

  // stats consistentes
  db.emprendedor._stats.servicios = db.servicios.length;
  db.emprendedor._stats.horarios = db.horarios.length;

  return db;
}
function nextId(db) {
  db.seq += 1;
  return db.seq;
}

/* ===========================
   Validaciones de turnos
=========================== */
function diaNombre(dateObj) {
  const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  return dias[dateObj.getDay()];
}
function dentroDeHorario(db, start, end) {
  const nombre = diaNombre(start);
  const rangos = db.horarios.filter((h) => h.dia === nombre);
  if (!rangos.length) return false;
  return rangos.some((h) => {
    const hs = new Date(start);
    const he = new Date(start);
    const [hd, md] = String(h.desde || "09:00").split(":").map(Number);
    const [hh, mh] = String(h.hasta || "18:00").split(":").map(Number);
    hs.setHours(hd, md, 0, 0);
    he.setHours(hh, mh, 0, 0);
    return hs <= start && end <= he;
  });
}
function superpuesto(db, start, end, excludeId = null) {
  return db.turnos.some((t) => {
    if (excludeId && t.id === excludeId) return false;
    const a = new Date(t.desde);
    const b = new Date(t.hasta);
    return start < b && a < end;
  });
}
// Generador de código seguro (sin O, I, 0, 1)
const SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genSafeCode(len = 6) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  return out;
}


/* ===========================
   MOCK (interfaz axios-like)
=========================== */
const mock = {
  defaults: { headers: { common: {} } },
  interceptors: { request: { use: () => {}, eject: () => {} }, response: { use: () => {}, eject: () => {} } },

  async get(url, config = {}) {
    await sleep();
    const db = loadDB();

    if (url === "/usuarios/me") {
      const u = JSON.parse(localStorage.getItem(LS.USER) || "null");
      if (!u) {
        const e = new Error("No logueado");
        e.response = { status: 401, data: { detail: "No logueado" } };
        throw e;
      }
      return { data: u };
    }

    if (url.startsWith("/emprendedores/by-codigo/")) {
      const code = decodeURIComponent(url.split("/").pop() || "").toUpperCase();
      if (code && db.emprendedor?.codigo_cliente?.toUpperCase() === code) {
        return { data: db.emprendedor };
      }
      const e = new Error("Código no encontrado");
      e.response = { status: 404, data: { detail: "Código no encontrado" } };
      throw e;
    }

    if (url === "/emprendedores/mi") return { data: db.emprendedor };
    if (url === "/servicios/mis" || url.startsWith("/servicios/de/")) return { data: db.servicios };
    if (url === "/horarios/mis" || url.startsWith("/horarios/de/")) return { data: db.horarios };

    if (url.startsWith("/turnos/mis") || url.startsWith("/turnos/de/")) {
      const p = (config && config.params) || {};
      const q = new URLSearchParams(url.split("?")[1] || "");
      const desde = p.desde || q.get("desde");
      const hasta = p.hasta || q.get("hasta");
      const d = desde ? new Date(desde) : new Date("1970-01-01");
      const h = hasta ? new Date(hasta) : new Date("2999-12-31");
      return {
        data: db.turnos.filter((t) => {
          const x = new Date(t.desde);
          return x >= d && x <= h;
        }),
      };
    }

    const e = new Error(`GET mock no implementado: ${url}`);
    e.response = { status: 404, data: { detail: e.message } };
    throw e;
  },

  async post(url, body) {
    await sleep();
    const db = loadDB();

    // LOGIN
    if (url === "/usuarios/login" || url === "/login") {
      const user = {
        id: Date.now(),
        username: body?.username || body?.identifier || "cliente_demo",
        email: body?.email || "cliente@mock.com",
        rol: "cliente",
      };
      localStorage.setItem(LS.USER, JSON.stringify(user));
      localStorage.setItem(LS.TOKEN, db.token);
      return { data: { user, access_token: db.token } };
    }

    // REGISTRO (no inicia sesión)
    if (url === "/usuarios") {
      const user = {
        id: Date.now(),
        username: body?.username,
        email: body?.email || null,
        rol: body?.rol || "cliente",
      };
      localStorage.setItem(LS.USER, JSON.stringify(user));
      return { data: user };
    }

    // ACTIVAR EMPRENDEDOR
    if (url === "/emprendedores/activar") {
      db.emprendedor = db.emprendedor || {};
      db.emprendedor.is_active = true;
      db.emprendedor._stats = db.emprendedor._stats || { servicios: 0, horarios: 0 };
      saveDB(db);
      return { data: db.emprendedor };
    }
    if (url === "/emprendedores/generar-codigo") {
      db.emprendedor = db.emprendedor || {};
      const needNew = body?.regenerar || !db.emprendedor?.codigo_cliente;
      if (needNew) {
        db.emprendedor.codigo_cliente = genSafeCode(body?.len || 6);
        saveDB(db);
      }
      return { data: { codigo: db.emprendedor.codigo_cliente } };
    }

    // SERVICIOS (alta)
    if (url === "/servicios") {
      db.servicios = Array.isArray(db.servicios) ? db.servicios : [];
      db.emprendedor = db.emprendedor || {};
      db.emprendedor._stats = db.emprendedor._stats || { servicios: 0, horarios: 0 };

      const s = {
        id: nextId(db),
        nombre: String(body?.nombre || "Servicio").trim(),
        duracion_min: Math.max(5, Number(body?.duracion_min) || 30),
        precio: Math.max(0, Number(body?.precio) || 0),
      };
      db.servicios.push(s);
      db.emprendedor._stats.servicios = db.servicios.length;
      saveDB(db);
      return { data: s, status: 201 };
    }

    // HORARIOS (alta)
    if (url === "/horarios") {
      db.horarios = Array.isArray(db.horarios) ? db.horarios : [];
      db.emprendedor = db.emprendedor || {};
      db.emprendedor._stats = db.emprendedor._stats || { servicios: 0, horarios: 0 };

      const h = {
        id: nextId(db),
        dia: body?.dia || "Lunes",
        desde: body?.desde || "09:00",
        hasta: body?.hasta || "18:00",
      };
      db.horarios.push(h);
      db.emprendedor._stats.horarios = db.horarios.length;
      saveDB(db);
      return { data: h, status: 201 };
    }

    // TURNOS (alta) — con validaciones de horario y superposición
    if (url === "/turnos") {
      const from = new Date(body.datetime || body.inicio || new Date());
      const serv = Array.isArray(db.servicios)
        ? db.servicios.find((s) => s.id === Number(body.servicio_id))
        : null;

      if (!serv) {
        const e = new Error("Servicio no encontrado");
        e.response = { status: 404, data: { detail: "Servicio no encontrado" } };
        throw e;
      }
      const to = new Date(from.getTime() + (serv.duracion_min || 30) * 60000);

      if (!dentroDeHorario(db, from, to)) {
        const e = new Error("Fuera del horario de atención");
        e.response = { status: 400, data: { detail: "Fuera del horario de atención" } };
        throw e;
      }
      if (superpuesto(db, from, to)) {
        const e = new Error("El horario se superpone con otro turno");
        e.response = { status: 400, data: { detail: "El horario se superpone con otro turno" } };
        throw e;
      }

      const t = {
        id: nextId(db),
        desde: from.toISOString(),
        hasta: to.toISOString(),
        servicio_id: Number(body.servicio_id),
        servicio: serv,
        cliente_nombre: body.cliente_nombre || body.cliente || "—",
        notas: body.notas || null,
        estado: "programado",
      };
      db.turnos.push(t);
      saveDB(db);
      return { data: t, status: 201 };
    }

    const e = new Error(`POST mock no implementado: ${url}`);
    e.response = { status: 404, data: { detail: e.message } };
    throw e;
  },

  async patch(url, body) {
    await sleep();
    const db = loadDB();

    // SERVICIOS (edición)
    if (url.startsWith("/servicios/")) {
      const id = Number(url.split("/").pop());
      db.servicios = Array.isArray(db.servicios) ? db.servicios : [];
      const s = db.servicios.find((x) => x.id === id);
      if (!s) throw withResp("Servicio no existe", 404);

      if (body?.nombre !== undefined) s.nombre = String(body.nombre || "Servicio").trim();
      if (body?.duracion_min !== undefined) s.duracion_min = Math.max(5, Number(body.duracion_min) || 30);
      if (body?.precio !== undefined) s.precio = Math.max(0, Number(body.precio) || 0);

      saveDB(db);
      return { data: s };
    }

    // HORARIOS (edición)
    if (url.startsWith("/horarios/")) {
      const id = Number(url.split("/").pop());
      db.horarios = Array.isArray(db.horarios) ? db.horarios : [];
      const h = db.horarios.find((x) => x.id === id);
      if (!h) throw withResp("Horario no existe", 404);

      if (body?.dia !== undefined) h.dia = String(body.dia || "Lunes");
      if (body?.desde !== undefined) h.desde = String(body.desde || "09:00");
      if (body?.hasta !== undefined) h.hasta = String(body.hasta || "18:00");

      saveDB(db);
      return { data: h };
    }

    // TURNOS (edición)
    if (url.startsWith("/turnos/")) {
      const id = Number(url.split("/").pop());
      db.turnos = Array.isArray(db.turnos) ? db.turnos : [];
      const t = db.turnos.find((x) => x.id === id);
      if (!t) throw withResp("Turno no existe", 404);

      const newInicio = body?.datetime || body?.inicio ? new Date(body.datetime || body.inicio) : new Date(t.desde);
      const newServ = (Array.isArray(db.servicios) ? db.servicios.find((s) => s.id === Number(body.servicio_id)) : null) || t.servicio;
      const newFin = new Date(newInicio.getTime() + (newServ?.duracion_min || 30) * 60000);

      if (!dentroDeHorario(db, newInicio, newFin)) throw withResp("Fuera del horario de atención", 400);
      if (superpuesto(db, newInicio, newFin, id)) throw withResp("El horario se superpone con otro turno", 400);

      t.desde = newInicio.toISOString();
      t.hasta = newFin.toISOString();
      if (body?.servicio_id !== undefined) { t.servicio_id = Number(body.servicio_id); t.servicio = newServ; }
      if (body?.cliente_nombre !== undefined || body?.cliente !== undefined) t.cliente_nombre = body.cliente_nombre || body.cliente || "—";
      if (body?.notas !== undefined) t.notas = body.notas || null;

      saveDB(db);
      return { data: t };
    }

    throw withResp(`PATCH mock no implementado: ${url}`, 404);
  },

  async delete(url) {
    await sleep();
    const db = loadDB();

    if (url.startsWith("/servicios/")) {
      const id = Number(url.split("/").pop());
      db.servicios = Array.isArray(db.servicios) ? db.servicios : [];
      db.servicios = db.servicios.filter((x) => x.id !== id);
      db.emprendedor._stats = db.emprendedor._stats || { servicios: 0, horarios: 0 };
      db.emprendedor._stats.servicios = db.servicios.length;
      saveDB(db);
      return { data: { ok: true } };
    }

    if (url.startsWith("/horarios/")) {
      const id = Number(url.split("/").pop());
      db.horarios = Array.isArray(db.horarios) ? db.horarios : [];
      db.horarios = db.horarios.filter((x) => x.id !== id);
      db.emprendedor._stats = db.emprendedor._stats || { servicios: 0, horarios: 0 };
      db.emprendedor._stats.horarios = db.horarios.length;
      saveDB(db);
      return { data: { ok: true } };
    }

    if (url.startsWith("/turnos/")) {
      const id = Number(url.split("/").pop());
      db.turnos = Array.isArray(db.turnos) ? db.turnos : [];
      db.turnos = db.turnos.filter((t) => t.id !== id);
      saveDB(db);
      return { data: { ok: true } };
    }

    throw withResp(`DELETE mock no implementado: ${url}`, 404);
  },
};

function withResp(message, status = 400) {
  const e = new Error(message);
  e.response = { status, data: { detail: message } };
  return e;
}

/* ===========================
   Axios real (si apagás mock)
=========================== */
function createReal() {
  const client = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((cfg) => {
    const tk = localStorage.getItem(LS.TOKEN);
    if (tk) cfg.headers.Authorization = `Bearer ${tk}`;
    return cfg;
  });
  client.interceptors.response.use(
    (res) => res,
    (error) => Promise.reject(error)
  );

  return {
    get: (url, cfg) => client.get(url, cfg),
    post: (url, data, cfg) => client.post(url, data, cfg),
    patch: (url, data, cfg) => client.patch(url, data, cfg),
    delete: (url, cfg) => client.delete(url, cfg),
  };
}

/* ===========================
   Export final
=========================== */
export const api = MOCK ? mock : createReal();
export default api;
