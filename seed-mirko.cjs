// seed-turnos-mirko.cjs
// Crea SOLO turnos para "Peluquería Mirko" en el MES ACTUAL.
// Requisitos ya cubiertos: usuario mirko/admin1234, plan activo, horarios, servicios.
// Ejecutar (PowerShell): node .\seed-turnos-mirko.cjs

const axios = require("axios");

const API_BASE = process.env.API_BASE || "http://localhost:8000";
const LOGIN_USER = "mirko";
const LOGIN_PASS = "admin1234";

// --- http base
const http = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

function pad(n) { return n.toString().padStart(2, "0"); }
function isoLocal(y, m, d, hh, mm) {
  // Fecha local -> ISO con zona local reflejada en Z (ok para la mayoría de APIs)
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  return dt.toISOString();
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function tel() {
  const a = 400 + Math.floor(Math.random()*600);
  const b = 1000 + Math.floor(Math.random()*9000);
  return `+54 9 351 ${a}-${b}`;
}

async function tryMany(calls) {
  let last = null;
  for (const fn of calls) {
    try { return await fn(); }
    catch (e) {
      const st = e?.response?.status;
      if (st !== 404 && st !== 405) throw e;
      last = e; // intenta próxima variante
    }
  }
  throw last;
}

async function login() {
  const r = await tryMany([
    () => http.post("/usuarios/login", { username: LOGIN_USER, password: LOGIN_PASS }),
    () => http.post("/usuarios/login", { email: LOGIN_USER, password: LOGIN_PASS }),
    () => http.post("/auth/login", { username: LOGIN_USER, password: LOGIN_PASS }),
  ]);
  const tok = r?.data?.token || r?.data?.access_token || r?.data?.jwt;
  if (!tok) throw new Error("No pude obtener token en login()");
  http.defaults.headers.Authorization = `Bearer ${tok}`;
  console.log("✓ Login OK");
}

async function getEmprendedor() {
  const r = await tryMany([
    () => http.get("/emprendedores/mi"),
    () => http.get("/usuarios/me/emprendedor"),
  ]);
  const e = r?.data || {};
  const out = {
    id: e.id ?? e.emprendedor_id ?? null,
    codigo: e.codigo_cliente || e.codigo || e.code || null,
  };
  if (!out.id && !out.codigo) throw new Error("No pude leer emprendedor (id/codigo)");
  console.log("✓ Emprendedor:", out);
  return out;
}

async function getServicios() {
  // Necesitamos nombres y (si hay) IDs para asignar variedad y precios
  try {
    const r = await tryMany([
      () => http.get("/servicios/mis"),
      () => http.get("/servicios"), // por si hay un GET público/propio
    ]);
    const arr = Array.isArray(r?.data) ? r.data : [];
    // Normalizo campos comunes
    return arr.map((s) => ({
      id: s.id ?? s.servicio_id ?? null,
      nombre: s.nombre || "Servicio",
      precio: typeof s.precio === "number" ? s.precio : (s?.precio_aplicado || 0),
      duracion: s.duracion_minutos ?? s.duracion ?? 45,
    }));
  } catch {
    // fallback: catálogo mínimo, sin IDs (el endpoint de turnos suele no exigirlo)
    return [
      { id: null, nombre: "Corte hombre", precio: 6500, duracion: 30 },
      { id: null, nombre: "Corte mujer", precio: 9000, duracion: 45 },
      { id: null, nombre: "Barba", precio: 3500, duracion: 20 },
      { id: null, nombre: "Coloración completa", precio: 22000, duracion: 90 },
    ];
  }
}

async function postTurno(payload) {
  try {
    return await tryMany([
      () => http.post("/turnos", payload),
      () => http.post("/reservas", payload),
      () => http.post("/turnos/crear", payload),
      () => http.post("/reservas/crear", payload),
    ]);
  } catch (e) {
    const st = e?.response?.status;
    if (st === 422 || st === 400) {
      console.log("↳ 422 payload:", JSON.stringify(payload));
      console.log("↳ detalle:", e?.response?.data);
    }
    throw e;
  }
}

async function crearTurnosMesActual(emp, servicios) {
  // DÍAS PUNTUALES del mes actual (pocos, pero suficientes para ver todo en Estadísticas)
  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth() + 1;

  // 4 días “con movimiento” dentro del mes
  const dias = [6, 9, 12, 16].filter((d) => d <= new Date(Y, M, 0).getDate());
  const horas = [
    [10, 0], [11, 30], [13, 0], [15, 0],
  ];

  // nombres cortos para diversidad
  const nombres = ["Sofía G.","Valentina R.","Martina S.","Mía P.","Emma B.",
                   "Mateo D.","Santino V.","Thiago C.","Bruno L.","Lucas F.",
                   "Agustina T.","Camila J.","Florencia M.","Olivia N."];

  let creados = 0;

  for (const d of dias) {
    for (let i = 0; i < horas.length; i++) {
      const [hh, mm] = horas[i];
      const svc = servicios[(i + d) % servicios.length];
      const startISO = isoLocal(Y, M, d, hh, mm);
      const end = new Date(new Date(startISO).getTime() + (svc.duracion || 45) * 60000);
      const endISO = end.toISOString();

      const estado = (i === 1 && d % 2 === 0) ? "cancelado" : "confirmado"; // algunos cancelados
      const cliente = pick(nombres);
      const telCli = tel();

      // Variante A: usando emprendedor_codigo (preferido por tu API)
      const baseA = {
        emprendedor_codigo: emp.codigo,          // ← CLAVE
        servicio_id: svc.id || undefined,        // si hay ID, mejor
        cliente_nombre: cliente,
        cliente_telefono: telCli,
        inicio: startISO,
        fin: endISO,
        estado,
        precio_aplicado: svc.precio || 0,
        notas: "Seed corto (demo)",
      };

      // Variante B: usando emprendedor_id
      const baseB = {
        emprendedor_id: emp.id,                  // ← fallback
        servicio_id: svc.id || undefined,
        cliente_nombre: cliente,
        cliente_telefono: telCli,
        inicio: startISO,
        fin: endISO,
        estado,
        precio_aplicado: svc.precio || 0,
        notas: "Seed corto (demo)",
      };

      let ok = false;
      try { await postTurno(baseA); ok = true; } catch {}
      if (!ok && emp.id) { try { await postTurno(baseB); ok = true; } catch {} }
      if (!ok) {
        // Última chance: nombres de campos alternativos
        const alt = {
          emprendedor_codigo: emp.codigo,
          desde: startISO, hasta: endISO,
          cliente: { nombre: cliente, telefono: telCli },
          servicio: { id: svc.id || undefined, nombre: svc.nombre, precio: svc.precio || 0 },
          estado,
          notas: "Seed corto (alt)",
        };
        try { await postTurno(alt); ok = true; } catch {}
      }

      if (ok) creados++;
    }
  }

  console.log(`✓ Turnos creados este mes: ${creados}`);
  if (creados === 0) {
    console.log("⚠️ No se pudieron crear turnos. Revisá los logs 422/400 para ver qué campos exactos pide tu API.");
  }
}

(async () => {
  try {
    console.log(`→ Seed turnos en ${API_BASE}`);
    await login();
    const emp = await getEmprendedor();         // {id, codigo}
    const servicios = await getServicios();     // lista con nombre/precio/(id?)
    await crearTurnosMesActual(emp, servicios);
    console.log("✅ Listo. Abrí *Estadísticas* (rango: mes actual) y deberías ver datos.");
  } catch (e) {
    console.error("❌ Falló:", e?.response?.status, e?.response?.data || e.message);
    process.exit(1);
  }
})();
