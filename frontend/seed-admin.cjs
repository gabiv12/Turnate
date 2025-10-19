// seed-admin.cjs
// Crea el usuario admin (id=1 si la BD está vacía) y verifica login.

const axios = require("axios");

const BASE = process.env.API_BASE || "http://localhost:8000";

async function tryRegister() {
  const payload = {
    username: "admin",
    email: "admin@example.com",
    password: "admin1234",
    nombre: "Administrador",
  };
  try {
    const r = await axios.post(`${BASE}/usuarios/registro`, payload, {
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    });
    if (r.status === 201) {
      console.log("✓ Usuario admin registrado (201)");
      return true;
    }
    if (r.status === 409) {
      console.log("[skip] admin ya existe (409)");
      return true;
    }
    console.log("✗ Registro admin no esperado:", r.status, r.data);
    return false;
  } catch (e) {
    console.log("✗ Error registrando admin:", e?.response?.status, e?.response?.data || e.message);
    return false;
  }
}

async function tryLogin() {
  // Probamos con username y, si falla, con email
  const credsList = [
    { username: "admin", password: "admin1234" },
    { email: "admin@example.com", password: "admin1234" },
    { username_or_email: "admin", password: "admin1234" }, // por si tu back usa este campo
  ];
  for (const creds of credsList) {
    try {
      const r = await axios.post(`${BASE}/usuarios/login`, creds, {
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      });
      if (r.status === 200 && r.data) {
        const { token, user } = r.data;
        console.log("✓ Login OK");
        console.log("→ user:", user);
        console.log("→ id:", user?.id, "rol:", user?.rol || "(desconocido)");
        if (user?.id !== 1) {
          console.warn("⚠ Ojo: el admin NO es id=1. Si querés que sea id=1, vaciá la BD y corré este seed primero.");
        }
        return { token, user };
      }
      console.log("Intento de login falló:", r.status, r.data);
    } catch (e) {
      console.log("Error login:", e?.response?.status, e?.response?.data || e.message);
    }
  }
  throw new Error("No se pudo iniciar sesión con admin/admin1234");
}

(async () => {
  console.log(`→ Seed admin en ${BASE}`);
  const regOk = await tryRegister();
  if (!regOk) process.exit(1);
  await tryLogin();
  console.log("✅ Listo. Usuario: admin / Password: admin1234");
})();
