// src/services/mockApi.js
// Mock simple en LocalStorage (single-tenant) con soporte por código de emprendedor.
// Semilla: emprendedor con código ABC123.

const LS = {
  EMP: "mock_emprendedor",
  SRV: "mock_servicios",
  HOR: "mock_horarios",
  TUR: "mock_turnos",
  USR: "mock_usuarios",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ===== Seed =====
(function seed() {
  const emp = read(LS.EMP, null);
  if (!emp) {
    write(LS.EMP, {
      id: 1,
      nombre: "Demo Barber",
      codigo: "ABC123",
      descripcion: "Barbería de ejemplo",
    });
  }
  if (!read(LS.SRV, null)) {
    write(LS.SRV, [
      { id: 1, nombre: "Corte clásico", duracion_min: 30, precio: 5000 },
      { id: 2, nombre: "Corte + Barba", duracion_min: 45, precio: 8000 },
    ]);
  }
  if (!read(LS.HOR, null)) {
    write(LS.HOR, [
      // Lunes a Viernes 09-13 y 16-20
      ...["Lunes","Martes","Miércoles","Jueves","Viernes"].map(d => ({ id: crypto.randomUUID(), dia: d, desde: "09:00", hasta: "13:00" })),
      ...["Lunes","Martes","Miércoles","Jueves","Viernes"].map(d => ({ id: crypto.randomUUID(), dia: d, desde: "16:00", hasta: "20:00" })),
      // Sábado solo 9-13
      { id: crypto.randomUUID(), dia: "Sábado", desde: "09:00", hasta: "13:00" },
    ]);
  }
  if (!read(LS.TUR, null)) {
    write(LS.TUR, []); // vacío
  }
  if (!read(LS.USR, null)) {
    write(LS.USR, []); // usuarios creados desde /usuarios/ (si usás el mock ahí)
  }
})();

function ok(data, status = 200) {
  return Promise.resolve({ status, data });
}
function err(message = "No encontrado", status = 404) {
  const e = new Error(message);
  e.response = { status, data: { detail: message } };
  return Promise.reject(e);
}

// Util
function addMinutesISO(iso, mins) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}
function toISODate(d) {
  return new Date(d).toISOString().slice(0, 10);
}
function betweenDates(t, desde, hasta) {
  if (!desde && !hasta) return true;
  const ts = new Date(t.desde).getTime();
  if (desde && ts < new Date(desde).getTime()) return false;
  if (hasta && ts > new Date(hasta).getTime()) return false;
  return true;
}

export const mock = {
  // ===== Emprendedor =====
  async get(url) {
    // /emprendedores/by-codigo/:code
    if (url.startsWith("/emprendedores/by-codigo/")) {
      const code = decodeURIComponent(url.split("/").pop() || "");
      const emp = read(LS.EMP, null);
      if (emp && emp.codigo?.toUpperCase() === String(code).toUpperCase()) {
        return ok(emp);
      }
      return err("No encontrado", 404);
    }

    // /servicios/mis  || /servicios/de/:code
    if (url === "/servicios/mis" || url.startsWith("/servicios/de/")) {
      const srv = read(LS.SRV, []);
      return ok(srv);
    }

    // /horarios/mis  || /horarios/de/:code
    if (url === "/horarios/mis" || url.startsWith("/horarios/de/")) {
      const hor = read(LS.HOR, []);
      return ok(hor);
    }

    // /turnos/mis?desde&hasta  || /turnos/de/:code?desde&hasta
    if (url.startsWith("/turnos/mis") || url.startsWith("/turnos/de/")) {
      const turnos = read(LS.TUR, []);
      // extraer params
      const q = new URLSearchParams(url.split("?")[1] || "");
      const desde = q.get("desde");
      const hasta = q.get("hasta");
      const filtrados = turnos.filter((t) => betweenDates(t, desde, hasta));
      return ok(filtrados);
    }

    // /usuarios/me (mock: sin auth, si necesitás)
    if (url === "/usuarios/me") {
      const usr = read(LS.USR, [])[0] || null;
      return ok(usr || { id: 1, username: "demo", rol: "emprendedor" });
    }

    return err("No encontrado", 404);
  },

  // ===== Crear recursos =====
  async post(url, body) {
    // /usuarios/ — si estás mockeando registro
    if (url === "/usuarios/") {
      const users = read(LS.USR, []);
      const exists = users.some(
        (u) => u.username === body.username || u.email === body.email
      );
      if (exists) return err("El usuario ya existe", 400);
      const nu = {
        id: crypto.randomUUID(),
        email: body.email,
        username: body.username,
        rol: body.rol || "cliente",
      };
      users.push(nu);
      write(LS.USR, users);
      return ok(nu, 201);
    }

    // /servicios
    if (url === "/servicios") {
      const srv = read(LS.SRV, []);
      const ns = {
        id: srv.length ? Math.max(...srv.map((s) => Number(s.id))) + 1 : 1,
        nombre: body.nombre,
        duracion_min: Number(body.duracion_min) || 30,
        precio: Number(body.precio) || 0,
      };
      srv.push(ns);
      write(LS.SRV, srv);
      return ok(ns, 201);
    }

    // /horarios
    if (url === "/horarios") {
      const hor = read(LS.HOR, []);
      const nh = {
        id: crypto.randomUUID(),
        dia: body.dia,
        desde: body.desde,
        hasta: body.hasta,
      };
      hor.push(nh);
      write(LS.HOR, hor);
      return ok(nh, 201);
    }

    // /turnos
    if (url === "/turnos") {
      const srv = read(LS.SRV, []);
      const tur = read(LS.TUR, []);
      const servicio = srv.find((s) => Number(s.id) === Number(body.servicio_id));
      if (!servicio) return err("Servicio inválido", 400);

      const desde = body.datetime; // ISO
      const hasta = addMinutesISO(desde, Number(servicio.duracion_min) || 30);

      const nuevo = {
        id: crypto.randomUUID(),
        servicio_id: Number(body.servicio_id),
        cliente_nombre: body.cliente_nombre || "—",
        notas: body.notas || "",
        desde,
        hasta,
        servicio: { ...servicio },
      };

      // Evitar choque simple en mock
      const choque = tur.some((t) => {
        const a1 = new Date(desde);
        const a2 = new Date(hasta);
        const b1 = new Date(t.desde);
        const b2 = new Date(t.hasta);
        return a1 < b2 && b1 < a2;
      });
      if (choque) return err("Horario no disponible", 400);

      tur.push(nuevo);
      write(LS.TUR, tur);
      return ok(nuevo, 201);
    }

    return err("No encontrado", 404);
  },

  // ===== Actualizar / Borrar =====
  async patch(url, body) {
    // /servicios/:id
    if (url.startsWith("/servicios/")) {
      const id = Number(url.split("/").pop());
      const srv = read(LS.SRV, []);
      const i = srv.findIndex((s) => Number(s.id) === id);
      if (i < 0) return err("No encontrado", 404);
      srv[i] = { ...srv[i], ...body, id };
      write(LS.SRV, srv);
      return ok(srv[i]);
    }

    // /horarios/:id
    if (url.startsWith("/horarios/")) {
      const id = url.split("/").pop();
      const hor = read(LS.HOR, []);
      const i = hor.findIndex((h) => String(h.id) === String(id));
      if (i < 0) return err("No encontrado", 404);
      hor[i] = { ...hor[i], ...body };
      write(LS.HOR, hor);
      return ok(hor[i]);
    }

    // /turnos/:id
    if (url.startsWith("/turnos/")) {
      const id = url.split("/").pop();
      const tur = read(LS.TUR, []);
      const i = tur.findIndex((t) => String(t.id) === String(id));
      if (i < 0) return err("No encontrado", 404);

      // recalcular hasta si cambió servicio o fecha
      const srv = read(LS.SRV, []);
      const servicio =
        srv.find((s) => Number(s.id) === Number(body.servicio_id ?? tur[i].servicio_id)) ||
        tur[i].servicio;
      const desde = body.datetime || tur[i].desde;
      const hasta = addMinutesISO(desde, Number(servicio.duracion_min) || 30);

      const updated = {
        ...tur[i],
        servicio_id: Number(body.servicio_id ?? tur[i].servicio_id),
        cliente_nombre: body.cliente_nombre ?? tur[i].cliente_nombre,
        notas: body.notas ?? tur[i].notas,
        desde,
        hasta,
        servicio,
      };

      // check choque
      const choque = tur.some((t) => {
        if (t.id === updated.id) return false;
        const a1 = new Date(updated.desde);
        const a2 = new Date(updated.hasta);
        const b1 = new Date(t.desde);
        const b2 = new Date(t.hasta);
        return a1 < b2 && b1 < a2;
      });
      if (choque) return err("Horario no disponible", 400);

      tur[i] = updated;
      write(LS.TUR, tur);
      return ok(updated);
    }

    return err("No encontrado", 404);
  },

  async delete(url) {
    // /servicios/:id
    if (url.startsWith("/servicios/")) {
      const id = Number(url.split("/").pop());
      const srv = read(LS.SRV, []);
      const i = srv.findIndex((s) => Number(s.id) === id);
      if (i < 0) return err("No encontrado", 404);
      srv.splice(i, 1);
      write(LS.SRV, srv);
      return ok({ ok: true });
    }
    // /horarios/:id
    if (url.startsWith("/horarios/")) {
      const id = url.split("/").pop();
      const hor = read(LS.HOR, []);
      const i = hor.findIndex((h) => String(h.id) === String(id));
      if (i < 0) return err("No encontrado", 404);
      hor.splice(i, 1);
      write(LS.HOR, hor);
      return ok({ ok: true });
    }
    // /turnos/:id
    if (url.startsWith("/turnos/")) {
      const id = url.split("/").pop();
      const tur = read(LS.TUR, []);
      const i = tur.findIndex((t) => String(t.id) === String(id));
      if (i < 0) return err("No encontrado", 404);
      tur.splice(i, 1);
      write(LS.TUR, tur);
      return ok({ ok: true });
    }

    return err("No encontrado", 404);
  },
};
