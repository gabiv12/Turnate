// src/services/turnos.js
import api from "./api";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
let _ownerCache = null;

async function getOwnerInfo(force = false) {
  if (!force && _ownerCache) return _ownerCache;
  try {
    const { data } = await api.get("/emprendedores/mi");
    _ownerCache = data ? { id: data.id, codigo: data.codigo_cliente } : null;
  } catch {
    _ownerCache = null;
  }
  return _ownerCache;
}

function toDate(v) {
  if (!v) return null;
  try { return new Date(v); } catch { return null; }
}

function normalizarPayloadTurno(p) {
  // Acepta {inicio, fin} o {datetime} o {desde, hasta}
  const out = {};
  if (p.servicio_id != null) out.servicio_id = Number(p.servicio_id);
  if (p.cliente_nombre != null) out.cliente_nombre = p.cliente_nombre;
  if (p.cliente_contacto != null) out.cliente_contacto = p.cliente_contacto;
  if (p.notas != null) out.notas = p.notas;

  if (p.inicio) out.inicio = p.inicio;
  if (p.fin) out.fin = p.fin;

  if (!out.inicio && p.desde) out.inicio = p.desde;
  if (!out.fin && p.hasta) out.fin = p.hasta;

  if (!out.inicio && p.datetime) out.inicio = p.datetime; // /turnos/compat lo acepta
  return out;
}

export function mapTurnoParaCalendario(t, servicios = []) {
  const start =
    toDate(t.inicio) || toDate(t.desde) || toDate(t.datetime) || new Date();
  const end =
    toDate(t.fin) || toDate(t.hasta) ||
    new Date(start.getTime() +
      (t?.servicio?.duracion_min ||
        servicios.find(s => s.id === Number(t.servicio_id))?.duracion_min ||
        30) * 60000);

  const nombreServicio =
    t?.servicio?.nombre ||
    servicios.find(s => s.id === Number(t.servicio_id))?.nombre ||
    t.titulo || "Servicio";

  const cliente = t?.cliente?.nombre || t.cliente_nombre || "—";

  return {
    id: t.id,
    title: `${cliente} · ${nombreServicio}`,
    start,
    end,
    servicio_id: t.servicio_id ?? null,
    servicio: nombreServicio,
    cliente_nombre: cliente,
    notas: t.notas ?? "",
    raw: t,
  };
}

// ─────────────────────────────────────────────────────────────
// Listados
// ─────────────────────────────────────────────────────────────
export async function listarTurnosPropios({ desde, hasta } = {}) {
  const me = await getOwnerInfo();
  const url = me ? "/turnos/owner" : "/turnos/mis";
  const { data } = await api.get(url, { params: { desde, hasta } });
  return Array.isArray(data) ? data : [];
}

export async function listarTurnosPublicos(codigo, { desde, hasta } = {}) {
  const { data } = await api.get(`/turnos/de/${encodeURIComponent(codigo)}`, {
    params: { desde, hasta },
  });
  return Array.isArray(data) ? data : [];
}

// ─────────────────────────────────────────────────────────────
// Altas / Cambios / Bajas
// ─────────────────────────────────────────────────────────────
export async function crearTurnoPrivado(payload) {
  const me = await getOwnerInfo();
  const body = normalizarPayloadTurno(payload);
  if (me?.id) body.emprendedor_id = me.id;
  const { data } = await api.post("/turnos/compat", body);
  return data;
}

export async function reservarTurno(codigo, payload) {
  const body = normalizarPayloadTurno(payload);
  body.emprendedor_codigo = String(codigo).toUpperCase();
  const { data } = await api.post("/turnos/compat", body);
  return data;
}

export async function reprogramarTurno(id, patch) {
  const body = normalizarPayloadTurno(patch);
  const { data } = await api.patch(`/turnos/${id}`, body);
  return data;
}

export async function cancelarTurno(id) {
  await api.delete(`/turnos/${id}`);
  return true;
}
