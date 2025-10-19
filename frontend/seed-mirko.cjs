// seed-mirko.cjs  (Node + Axios, CommonJS)
// Uso en Windows PowerShell:
//   $env:API_BASE="http://localhost:8000"; node .\seed-mirko.cjs
//
const axios = require("axios");

const API_BASE = process.env.API_BASE || "http://localhost:8000";

// ---------- helpers de consola ----------
const log = (...a) => console.log(...a);
const ok = (m) => console.log("✓", m);
const fail = (m, e) => console.error("✗", m, e?.response?.status || "", e?.response?.data || e?.message);

// ---------- http básico ----------
function client(token) {
  const inst = axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 15000,
  });
  return inst;
}

async function tryPost(inst, url, data) {
  try { return await inst.post(url, data); }
  catch (e) { throw e; }
}
async function tryGet(inst, url, config) {
  try { return await inst.get(url, config); }
  catch (e) { throw e; }
}
async function tryPut(inst, url, data) {
  try { return await inst.put(url, data); }
  catch (e) { throw e; }
}

// ---------- pasos ----------
async function ensureUser(username, password) {
  const c = client();
  // 1) registrarse si hace falta
  try {
    await tryPost(c, "/usuarios/registro", { username, password, email: `${username}@demo.local` });
    ok("Usuario registrado (registro)");
  } catch (e) {
    const s = e?.response?.status;
    if (s && s !== 409) {
      // probamos /usuarios/register si /registro no existe
      try {
        await tryPost(c, "/usuarios/register", { username, password, email: `${username}@demo.local` });
        ok("Usuario registrado (register)");
      } catch (e2) {
        // si ya existe 409, seguimos; otros errores abortan
        const s2 = e2?.response?.status;
        if (s2 && s2 !== 409) {
          fail("Registro", e2);
          throw e2;
        }
      }
    }
  }

  // 2) login
  try {
    const r = await tryPost(c, "/usuarios/login", { username, password });
    ok("Login OK");
    const token = r?.data?.token || r?.data?.access_token;
    const user = r?.data?.user || r?.data?.usuario || {};
    if (!token) throw new Error("No token devuelto por /usuarios/login");
    return { token, user };
  } catch (e) {
    fail("Login", e);
    throw e;
  }
}

async function ensureEmprendedor(token) {
  let c = client(token);
  // activar plan
  try {
    const r = await tryPost(c, "/emprendedores/activar", {});
    const newToken = r?.data?.token || r?.data?.access_token;
    if (newToken) {
      token = newToken;
      c = client(token);
    }
    ok("Plan Emprendedor activado");
  } catch (e) {
    const s = e?.response?.status;
    if (s && s !== 409 && s !== 400) {
      fail("Activar Emprendedor", e);
      throw e;
    }
  }

  // traer /emprendedores/mi
  let emp = null;
  try {
    const r2 = await tryGet(c, "/emprendedores/mi");
    emp = r2?.data || null;
  } catch {
    emp = null;
  }

  // completar datos si faltan
  const baseCodigo = "MIRKO";
  const payload = {
    nombre: "Peluquería Mirko",
    telefono_contacto: "+54 9 351 555-5555",
    direccion: "Av. Siempreviva 742, Córdoba",
    rubro: "Peluquería",
    descripcion: "Cortes, color y barbería. Atención por turnos.",
    codigo_cliente: emp?.codigo_cliente || baseCodigo,
    codigo: emp?.codigo || emp?.codigo_cliente || baseCodigo,
  };

  try {
    await tryPut(c, "/emprendedores/mi", payload);
    ok("Emprendimiento configurado");
  } catch (e) {
    fail("Configurar Emprendimiento", e);
    throw e;
  }

  // refrescar
  const r3 = await tryGet(c, "/emprendedores/mi");
  emp = r3?.data || {};
  if (!emp?.id && !emp?.codigo_cliente) throw new Error("No se pudo obtener el emprendedor");
  return { token, emp };
}

async function ensureServicios(token) {
  const c = client(token);
  const lista = [
    { nombre: "Corte hombre", precio: 6500, duracion_minutos: 30 },
    { nombre: "Corte mujer", precio: 9000, duracion_minutos: 45 },
    { nombre: "Barba", precio: 3500, duracion_minutos: 20 },
    { nombre: "Corte + Barba", precio: 9000, duracion_minutos: 60 },
    { nombre: "Lavado y Peinado", precio: 6000, duracion_minutos: 30 },
    { nombre: "Coloración completa", precio: 22000, duracion_minutos: 90 },
    { nombre: "Reflejos / Balayage", precio: 32000, duracion_minutos: 120 },
    { nombre: "Tratamiento keratina", precio: 38000, duracion_minutos: 120 },
    { nombre: "Nutrición capilar", precio: 15000, duracion_minutos: 60 },
    { nombre: "Peinado fiesta", precio: 12000, duracion_minutos: 60 },
  ];

  for (const s of lista) {
    try {
      await tryPost(c, "/servicios", s);
    } catch (e) {
      const status = e?.response?.status;
      if (status && status !== 409) {
        fail(`Crear servicio ${s.nombre}`, e);
      }
    }
  }
  ok(`Servicios listos (${lista.length})`);

  // obtener con IDs
  try {
    const rr = await tryGet(c, "/servicios/mis");
    const arr = Array.isArray(rr?.data) ? rr.data : [];
    return arr;
  } catch (e) {
    fail("Listar servicios", e);
    return [];
  }
}

function pick(arr, name) {
  return arr.find((x) => (x?.nombre || "").toLowerCase() === name.toLowerCase());
}

function toISO(d) { return new Date(d).toISOString(); }

function buildTurnoPayload({ emp, servicio, fecha, hora, mins, estado, cliente }) {
  // fecha "YYYY-MM-DD", hora "HH:mm"
  const [H, M] = (hora || "12:00").split(":").map((n) => parseInt(n, 10));
  const start = new Date(fecha + "T00:00:00");
  start.setHours(H, M, 0, 0);
  const end = new Date(start.getTime() + (mins || 60) * 60000);

  const nombre = cliente?.nombre || "—";
  const telefono = cliente?.telefono || null;

  const payload = {
    emprendedor_id: emp?.id,
    emprendedor_codigo: emp?.codigo_cliente || emp?.codigo,
    servicio_id: Number(servicio?.id),
    inicio: toISO(start),
    fin: toISO(end),
    estado: estado || "confirmado",
    precio_aplicado: Number(servicio?.precio) || 0,
    duracion_minutos: Number(servicio?.duracion_minutos) || 60,
    notas: "Seed demo",

    // campos de cliente para que el back persista el nombre
    cliente_nombre: nombre,
    cliente_telefono: telefono,
    cliente: { nombre, telefono },
    nombre_cliente: nombre,
    telefono_cliente: telefono,
  };

  // limpiar undefined
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  return payload;
}

function yyyy_mm_dd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sampleClients() {
  return [
    { nombre: "Nadia S.", telefono: "+54 9 351 952-2241" },
    { nombre: "Lucas P.", telefono: "+54 9 351 222-1144" },
    { nombre: "Agustina M.", telefono: "+54 9 351 733-8877" },
    { nombre: "Marcos D.", telefono: "+54 9 351 402-3311" },
    { nombre: "Carolina R.", telefono: "+54 9 351 881-5599" },
    { nombre: "Iván T.", telefono: "+54 9 351 664-4477" },
  ];
}

async function seedTurnos(token, emp, servicios) {
  const c = client(token);
  const cli = sampleClients();

  // Elegimos servicios por nombre (caen a cualquiera si falta alguno)
  const s1 = pick(servicios, "Nutrición capilar") || servicios[0];
  const s2 = pick(servicios, "Peinado fiesta") || servicios[1];
  const s3 = pick(servicios, "Reflejos / Balayage") || servicios[2];
  const s4 = pick(servicios, "Tratamiento keratina") || servicios[3];
  const s5 = pick(servicios, "Corte + Barba") || servicios[4];
  const s6 = pick(servicios, "Corte hombre") || servicios[5];
  const s7 = pick(servicios, "Corte mujer") || servicios[6];
  const s8 = pick(servicios, "Lavado y Peinado") || servicios[7];
  const s9 = pick(servicios, "Coloración completa") || servicios[8];

  // Fechas en el mes actual (para que se vean en Estadísticas)
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const dias = [1, 2, 3, 4, 8, 9, 10, 12, 15, 16, 18, 22, 23, 24, 28, 29]; // varios días del mes
  const horas = ["13:00", "14:30", "16:00", "18:00", "19:00"]; // franjas

  let creados = 0;
  for (const d of dias) {
    const fecha = yyyy_mm_dd(new Date(y, m, d));
    const todays = [
      { servicio: s6, hora: "12:30" },
      { servicio: s1, hora: "13:00" },
      { servicio: s2, hora: "14:30" },
      { servicio: s3, hora: "16:00" },
      { servicio: s4, hora: "18:00" },
      { servicio: s5, hora: "19:00" },
      { servicio: s7, hora: "15:00" },
      { servicio: s8, hora: "11:30" },
      { servicio: s9, hora: "17:30" },
    ];

    for (let i = 0; i < todays.length; i++) {
      const svc = todays[i].servicio;
      if (!svc?.id) continue;
      const persona = cli[(d + i) % cli.length];
      const payload = buildTurnoPayload({
        emp,
        servicio: svc,
        fecha,
        hora: todays[i].hora,
        mins: svc?.duracion_minutos || 60,
        estado: i % 7 === 0 ? "cancelado" : "confirmado", // algunos cancelados
        cliente: persona,
      });

      try {
        await tryPost(c, "/turnos", payload);
        creados++;
      } catch (e) {
        // mostrar por qué falla y seguir
        const data = e?.response?.data;
        console.log("Turno 422/400 payload:", JSON.stringify(payload));
        console.log("Detalle:", data);
      }
    }
  }
  ok(`Turnos creados: ${creados}`);
}

async function main() {
  log(`→ Seed completo en ${API_BASE}`);

  // 1) usuario/login
  const { token: token0 } = await ensureUser("mirko", "admin1234");

  // 2) emprendedor + datos
  const { token, emp } = await ensureEmprendedor(token0);

  // 3) servicios
  const servicios = await ensureServicios(token);

  // 4) turnos (con cliente_nombre)
  await seedTurnos(token, emp, servicios);

  console.log("\n✅ Seed listo. Ingresá con:");
  console.log("   usuario: mirko");
  console.log("   password: admin1234");
}

main().catch((e) => {
  fail("Seed general", e);
  process.exit(1);
});
