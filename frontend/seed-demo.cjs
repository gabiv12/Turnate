// frontend/seed-demo.cjs
// Seed demo: crea emprendedor "mirko", servicios y ~60 turnos últimos 30 días.
const axios = require("axios");

const BASE = process.env.API_BASE || "http://localhost:8000";
const EMP_USER = { username: "mirko", email: "mirko@example.com", password: "admin1234" };
const EMP_CODIGO = "MIRKO"; // código público
const EMP_PERFIL = {
  nombre: "Peluquería Mirko",
  telefono_contacto: "+54 9 11 5555-5555",
  direccion: "Av. Siempre Viva 742, CABA",
  rubro: "Peluquería",
  descripcion: "Color, cortes y tratamientos. Agenda online 24/7.",
};

const SERVICIOS = [
  { nombre: "Corte hombre", precio: 6500, duracion_minutos: 30 },
  { nombre: "Corte mujer", precio: 9000, duracion_minutos: 45 },
  { nombre: "Corte + Barba", precio: 9000, duracion_minutos: 45 },
  { nombre: "Barba", precio: 3500, duracion_minutos: 20 },
  { nombre: "Lavado y Peinado", precio: 6000, duracion_minutos: 40 },
  { nombre: "Nutrición capilar", precio: 15000, duracion_minutos: 60 },
  { nombre: "Peinado fiesta", precio: 12000, duracion_minutos: 60 },
  { nombre: "Coloración completa", precio: 22000, duracion_minutos: 90 },
  { nombre: "Reflejos / Balayage", precio: 32000, duracion_minutos: 120 },
  { nombre: "Tratamiento keratina", precio: 38000, duracion_minutos: 120 },
];

const CLIENTES = [
  "Agustina R.", "Bruno T.", "Camila P.", "Daniel G.", "Emilia V.",
  "Franco D.", "Giselle C.", "Hernán R.", "Ivana L.", "Julián K.",
  "Karina S.", "Leo P.", "Mica G.", "Nadia S.", "Octavio C.",
  "Paula N.", "Quique J.", "Rocío B.", "Sofía T.", "Tomás W."
];
const TEL = () => {
  const a = Math.floor(900+Math.random()*100), b = Math.floor(100+Math.random()*900), c = Math.floor(1000+Math.random()*9000);
  return `+54 9 11 ${a}-${b}${c}`;
};

const api = axios.create({ baseURL: BASE, timeout: 15000 });
const setToken = (t) => (api.defaults.headers.common.Authorization = `Bearer ${t}`);

async function main() {
  console.log(`→ Seed demo en ${BASE}`);

  // 1) Registrar (si ya existe, sigue) y loguear
  try {
    await api.post("/usuarios/registro", {
      username: EMP_USER.username,
      email: EMP_USER.email,
      password: EMP_USER.password,
    });
    console.log("✓ Usuario registrado (registro)");
  } catch (e) {
    if (e?.response?.status === 409) {
      console.log("[skip] usuario ya existe");
    } else if (e?.response?.status === 404) {
      // Algunos back tenían /usuarios/register
      try {
        await api.post("/usuarios/register", {
          username: EMP_USER.username,
          email: EMP_USER.email,
          password: EMP_USER.password,
        });
        console.log("✓ Usuario registrado (register)");
      } catch (e2) {
        if (e2?.response?.status !== 409) {
          console.log("⚠️ Registro: continuamos igual (puede que ya exista).");
        }
      }
    }
  }

  const loginRes = await api.post("/usuarios/login", {
    username: EMP_USER.username,
    password: EMP_USER.password,
  });
  const token =
    loginRes.data?.token ||
    loginRes.data?.access_token ||
    loginRes.data?.accessToken;
  if (!token) throw new Error("No vino token en /usuarios/login");
  setToken(token);
  console.log("✓ Login OK");

  // 2) Activar plan emprendedor
  try {
    const act = await api.post("/emprendedores/activar");
    const newToken = act.data?.token;
    if (newToken) setToken(newToken);
    console.log("✓ Plan Emprendedor activado");
  } catch (e) {
    // si ya está activo, seguimos
    console.log("[skip] activar emprendedor (posible 409/404)");
  }

  // 3) Configurar /emprendedores/mi con código público
  await api.put("/emprendedores/mi", {
    ...EMP_PERFIL,
    codigo_cliente: EMP_CODIGO,
    codigo: EMP_CODIGO,
  });
  console.log("✓ Emprendimiento configurado");

  // 4) Crear servicios (idempotente; si existen, seguimos)
  let servicioMap = new Map();
  for (const s of SERVICIOS) {
    try {
      const r = await api.post("/servicios", s);
      servicioMap.set(r.data?.id, { ...s, id: r.data?.id });
    } catch (e) {
      // si falla por duplicado, luego leemos /servicios/mis
    }
  }
  // Releer mis servicios para mapear ids/precios duraciones
  try {
    const { data } = await api.get("/servicios/mis");
    (data || []).forEach((s) => {
      servicioMap.set(Number(s.id), {
        id: Number(s.id),
        nombre: s.nombre,
        precio: Number(s.precio) || 0,
        duracion_minutos: Number(s.duracion_minutos) || 60,
      });
    });
    console.log(`✓ Servicios listos (${servicioMap.size})`);
  } catch {
    console.log("⚠️ No se pudieron leer /servicios/mis, seguimos.");
  }

  // 5) ~60 turnos en últimos 30 días
  const serviciosArr = [...servicioMap.values()];
  if (!serviciosArr.length) throw new Error("No hay servicios para crear turnos.");

  const now = new Date();
  const startWindow = new Date(now);
  startWindow.setDate(now.getDate() - 30);

  let created = 0;
  for (let i = 0; i < 60; i++) {
    const svc = serviciosArr[Math.floor(Math.random() * serviciosArr.length)];
    const dayOffset = Math.floor(Math.random() * 30); // 0..29 días atrás
    const hour = [13, 14, 15, 16, 17, 18, 19][Math.floor(Math.random() * 7)];
    const minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];

    const start = new Date(now);
    start.setDate(now.getDate() - dayOffset);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start.getTime() + (svc.duracion_minutos || 60) * 60000);

    const estado = Math.random() < 0.12 ? "cancelado" : "confirmado";
    const cliente_nombre = CLIENTES[Math.floor(Math.random() * CLIENTES.length)];
    const payload = {
      emprendedor_codigo: EMP_CODIGO,
      servicio_id: svc.id,
      cliente_nombre,
      cliente_telefono: TEL(),
      inicio: start.toISOString(),
      fin: end.toISOString(),
      estado,
      precio_aplicado: Number(svc.precio) || 0,
      duracion_minutos: Number(svc.duracion_minutos) || 60,
      notas: "Seed demo",
    };

    try {
      await api.post("/turnos", payload);
      created++;
    } catch (e) {
      const d = e?.response?.data;
      console.log("[skip] turno", e?.response?.status, d || "");
    }
  }

  console.log(`✓ Turnos creados: ${created}`);
  console.log(`
✅ Seed listo. Ingresá con:
   usuario: ${EMP_USER.username}
   password: ${EMP_USER.password}
`);
}

main().catch((e) => {
  console.error("❌ Seed falló:", e?.response?.status, e?.response?.data || e.message);
  process.exit(1);
});
