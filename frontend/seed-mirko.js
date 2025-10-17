// seed-mirko.js
// Seed de demo para "Peluquería Mirko"
// Crea usuario mirko/admin1234, intenta activar emprendedor, crea servicios en ARS,
// y genera turnos realistas de ~60 días para que "Estadísticas" quede poblado.

// USO: API_BASE=http://localhost:8000 node seed-mirko.js
const axios = require("axios");

const API_BASE = process.env.API_BASE || "http://localhost:8000";
const USERNAME = "mirko";
const PASSWORD = "admin1234";
const EMAIL = "mirko@demo.local";
const NOMBRE = "Mirko";

const http = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  // timeout opcional
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tryMany(calls, opts = {}) {
  let lastErr = null;
  for (const fn of calls) {
    try { return await fn(); } 
    catch (e) {
      const st = e?.response?.status;
      if (opts.verbose) console.log("[skip]", fn.name || "call", st || e.code || e.message);
      if (st !== 404 && st !== 405) {
        lastErr = e; // error "real" — devolvemos
        break;
      }
      lastErr = e;
    }
  }
  if (opts.swallow404) return null;
  throw lastErr;
}

// ---------------------- AUTH / USUARIO ----------------------
async function ensureUser() {
  // 1) registrar si hay endpoint, sino ignorar
  await tryMany([
    () => http.post("/usuarios/register", { username: USERNAME, password: PASSWORD, email: EMAIL, nombre: NOMBRE }),
    () => http.post("/usuarios/registro", { username: USERNAME, password: PASSWORD, email: EMAIL, nombre: NOMBRE }),
    () => http.post("/auth/register", { username: USERNAME, password: PASSWORD, email: EMAIL, nombre: NOMBRE }),
    () => http.post("/register", { username: USERNAME, password: PASSWORD, email: EMAIL, nombre: NOMBRE }),
    () => http.post("/usuarios", { username: USERNAME, password: PASSWORD, email: EMAIL, nombre: NOMBRE }),
  ], { swallow404: true, verbose: true }).catch(e => {
    const st = e?.response?.status;
    if (st === 409) return; // ya existe
    throw e;
  });

  // 2) login (esta ruta existe según tus logs)
  const loginRes = await tryMany([
    () => http.post("/usuarios/login", { username: USERNAME, password: PASSWORD }),
    () => http.post("/usuarios/login", { email: EMAIL, password: PASSWORD }),
    () => http.post("/auth/login", { username: USERNAME, password: PASSWORD }),
  ]);
  const tok = loginRes?.data?.token || loginRes?.data?.access_token || loginRes?.data?.jwt;
  if (!tok) throw new Error("No pude obtener token de login.");
  http.defaults.headers.Authorization = `Bearer ${tok}`;
  console.log("✓ Login OK");
}

// ---------------------- EMPRENDEDOR ----------------------
async function activateEmprendedor() {
  // Si existe, activa. Si no, ignore.
  await tryMany([
    () => http.post("/emprendedores/activar"),
    () => http.post("/plan/activar", { plan: "emprendedor" }),
  ], { swallow404: true, verbose: true }).catch(() => {});
  // Config opcional del emprendimiento + código público
  await tryMany([
    () => http.put("/emprendedores/mi", {
      nombre: "Peluquería Mirko",
      telefono_contacto: "+54 9 351 555-0000",
      direccion: "Av. Siempreviva 123, Córdoba",
      rubro: "Peluquería y Barbería",
      descripcion: "Cortes modernos, color y tratamientos. Tu estilo, nuestro arte.",
      codigo_cliente: "MIRKO",
      codigo: "MIRKO",
    }),
  ], { swallow404: true, verbose: true }).catch(() => {});
  console.log("✓ Emprendedor (si existe) activado/configurado");
}

// ---------------------- SERVICIOS ----------------------
const serviciosCatalogo = [
  { nombre: "Corte hombre", precio: 6500, duracion: 30 },
  { nombre: "Corte mujer", precio: 9000, duracion: 45 },
  { nombre: "Barba", precio: 3500, duracion: 20 },
  { nombre: "Corte + Barba", precio: 9000, duracion: 50 },
  { nombre: "Coloración completa", precio: 22000, duracion: 90 },
  { nombre: "Reflejos / Balayage", precio: 32000, duracion: 120 },
  { nombre: "Lavado y Peinado", precio: 6000, duracion: 30 },
  { nombre: "Peinado fiesta", precio: 12000, duracion: 60 },
  { nombre: "Tratamiento keratina", precio: 38000, duracion: 120 },
  { nombre: "Nutrición capilar", precio: 15000, duracion: 60 },
];

async function createServicios() {
  const map = new Map(); // nombre -> id o payload base

  for (const s of serviciosCatalogo) {
    const body = { nombre: s.nombre, precio: s.precio, duracion_minutos: s.duracion };
    let created = null;
    try {
      created = await tryMany([
        () => http.post("/servicios", body),
        () => http.post("/emprendedores/servicios", body),
        () => http.post("/servicios/crear", body),
      ], { swallow404: true, verbose: true });
    } catch (e) {
      // Si hay error distinto de 404/405 (p.ej. validation), intentamos sin duracion
      if (e?.response?.status === 422) {
        const b2 = { nombre: s.nombre, precio: s.precio };
        created = await tryMany([
          () => http.post("/servicios", b2),
          () => http.post("/emprendedores/servicios", b2),
          () => http.post("/servicios/crear", b2),
        ], { swallow404: true, verbose: true }).catch(() => null);
      }
    }
    const id = created?.data?.id || created?.data?.servicio_id || created?.data?.id_servicio;
    map.set(s.nombre, { id: id || null, ...s });
  }

  console.log(`✓ Servicios creados/intentados (${serviciosCatalogo.length})`);
  return map;
}

// ---------------------- TURNOS (RESERVAS) ----------------------
const nombres = [
  "Sofía", "Valentina", "Martina", "Isabella", "Mía", "Emma", "Lola", "Juana",
  "Mateo", "Santino", "Thiago", "Benjamín", "Joaquín", "Tomás", "Lucas", "Bruno",
  "Agustina", "Camila", "Florencia", "Catalina", "Lucía", "Olivia", "Renata", "Mila",
  "Franco", "Facundo", "Pedro", "Julián", "Simón", "Juan", "Ramiro", "Diego",
  "Carla", "Paula", "Noelia", "Gabriela", "Nadia", "Cecilia", "Antonella", "Bárbara",
  "Ezequiel", "Leandro", "Nicolás", "Gonzalo", "Emiliano", "Iván", "Santiago", "Alan",
];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(array) { return array[rand(0, array.length - 1)]; }

function argBusinessSlots(date) {
  // genera slots de 10:00 a 19:00 cada 30min aprox, 6-10 turnos por día
  const base = new Date(date);
  base.setHours(10, 0, 0, 0);
  const count = rand(6, 10);
  const slots = [];
  for (let i = 0; i < count; i++) {
    const start = new Date(base.getTime() + rand(0, 18) * 15 * 60000); // ruido
    slots.push(start);
  }
  // ordenar y eliminar overlap leve
  slots.sort((a, b) => a - b);
  return slots;
}

async function createTurno(payload) {
  return await tryMany([
    () => http.post("/turnos", payload),
    () => http.post("/reservas", payload),
    () => http.post("/turnos/crear", payload),
    () => http.post("/reservas/crear", payload),
  ], { swallow404: false, verbose: true });
}

function toISOZ(d) {
  // a UTC ISO; tu backend ya maneja Z en filtros
  const dd = new Date(d);
  return dd.toISOString();
}

async function seedTurnos(serviciosMap) {
  const hoy = new Date();
  const startDay = new Date(hoy);
  startDay.setDate(hoy.getDate() - 60); // 60 días atrás

  let creados = 0;
  for (let d = new Date(startDay); d <= hoy; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    // opcional: menos carga domingos
    const dow = day.getDay(); // 0=Dom
    if (dow === 0 && Math.random() < 0.6) continue;

    const slots = argBusinessSlots(day);
    for (const st of slots) {
      const svc = pick(serviciosCatalogo);
      const svcMeta = serviciosMap.get(svc.nombre);
      const dur = svcMeta?.duracion || 45;

      const start = new Date(st);
      const end = new Date(start.getTime() + dur * 60000);

      const estado = Math.random() < 0.14 ? "cancelado" : "confirmado";
      const cliente = pick(nombres) + " " + pick(["G.", "R.", "S.", "P.", "B.", "D."]);
      const precio = svcMeta?.precio || svc.precio;

      // payload flexible: intenta con servicio_id si lo tenemos; si no, manda nombres
      const payloads = [
        {
          // esquema común
          servicio_id: svcMeta?.id || undefined,
          cliente_nombre: cliente,
          cliente_telefono: `+54 9 351 ${rand(400, 999)}-${rand(1000, 9999)}`,
          inicio: toISOZ(start),
          fin: toISOZ(end),
          estado,
          precio_aplicado: precio,
          notas: "Seed demo",
        },
        {
          // variante con desde/hasta
          servicio_id: svcMeta?.id || undefined,
          cliente_nombre: cliente,
          cliente_telefono: `+54 9 351 ${rand(400, 999)}-${rand(1000, 9999)}`,
          desde: toISOZ(start),
          hasta: toISOZ(end),
          estado,
          precio_aplicado: precio,
          notas: "Seed demo",
        },
        {
          // variante sin id: embed nombre/precio (para ramas que aceptan objeto)
          servicio: { nombre: svc.nombre, precio },
          cliente: { nombre: cliente, telefono: `+54 9 351 ${rand(400, 999)}-${rand(1000, 9999)}` },
          inicio: toISOZ(start),
          fin: toISOZ(end),
          estado,
          precio_aplicado: precio,
          notas: "Seed demo",
        },
      ];

      let ok = false;
      for (const body of payloads) {
        try {
          await createTurno(body);
          ok = true;
          break;
        } catch (e) {
          const st = e?.response?.status;
          // Si es validación 422 en una variante, pruebo la siguiente
          if (st === 422 || st === 400 || st === 404 || st === 405) continue;
          // Cualquier otro error corto el seed para avisar
          throw e;
        }
      }
      if (ok) creados++;
      // mini pausa para no saturar
      if (creados % 25 === 0) await sleep(100);
    }
  }
  console.log(`✓ Turnos creados: ${creados}`);
}

// ---------------------- RUN ----------------------
(async () => {
  try {
    console.log(`→ Seed en ${API_BASE}`);
    await ensureUser();
    await activateEmprendedor();
    const serviciosMap = await createServicios();
    await seedTurnos(serviciosMap);
    console.log("✅ Seed completo. Entrá con:");
    console.log(`   usuario: ${USERNAME}`);
    console.log(`   password: ${PASSWORD}`);
  } catch (e) {
    console.error("❌ Seed falló:", e?.response?.status, e?.response?.data || e.message);
    process.exit(1);
  }
})();
