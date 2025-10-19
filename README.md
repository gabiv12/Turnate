Turnera (Turnate) — Setup, Demo y Seeds

Sistema de turnos para emprendedores: Servicios, Horarios, Turnos, Reserva pública por código, panel de Agenda y Estadísticas.

🔧 Requisitos

Node.js 20+ y npm 10+

Python 3.11+ y pip

(opcional) Git

Puertos por defecto:

Backend: http://127.0.0.1:8000

Frontend: http://127.0.0.1:5173

Estructura recomendada:

/turnera
  /backend   # FastAPI
  /frontend  # React + Vite + Tailwind

 Opción A — DEMO instantánea (sin backend) [MOCK]

Esta opción levanta solo el Frontend con una API mock en LocalStorage. Es ideal para grabar el video rápido (incluye seed y el código público ABC123).

Ir a /frontend e instalar:

npm install


(Ya viene por defecto) Asegurate que en src/services/api.js esté:

const MOCK = true;


Correr:

npm run dev


Abrí el modo público:

http://127.0.0.1:5173/reservar/ABC123


(Opcional) Semilla extra para Gráficos: pegá este snippet en la Consola del navegador (pestaña donde está abierto el sitio) para crear 15 turnos históricos y que “Estadísticas” tenga material:

(function () {
  const KEY = "turnate_mock_db";
  const db = JSON.parse(localStorage.getItem(KEY) || "{}");
  db.emprendedor = db.emprendedor || { id: 1, nombre: "Mi Emprendimiento", codigo_cliente: "ABC123", _stats:{servicios:0, horarios:0} };
  db.servicios = Array.isArray(db.servicios) && db.servicios.length ? db.servicios : [
    { id: 1, nombre: "Corte de pelo", duracion_min: 30, precio: 5000 },
    { id: 2, nombre: "Color", duracion_min: 90, precio: 15000 }
  ];
  db.horarios = Array.isArray(db.horarios) && db.horarios.length ? db.horarios : [
    { id: 101, dia: "Lunes", desde: "09:00", hasta: "13:00" },
    { id: 102, dia: "Lunes", desde: "15:00", hasta: "20:00" },
    { id: 103, dia: "Martes", desde: "09:00", hasta: "13:00" }
  ];
  db.emprendedor._stats = { servicios: db.servicios.length, horarios: db.horarios.length };
  db.turnos = Array.isArray(db.turnos) ? db.turnos : [];
  db.seq = typeof db.seq === "number" ? db.seq : 200;

  const now = new Date();
  function addTurno(d, servicio) {
    const inicio = new Date(d);
    const fin = new Date(inicio.getTime() + (servicio.duracion_min || 30) * 60000);
    db.turnos.push({
      id: ++db.seq,
      servicio_id: servicio.id,
      servicio,
      desde: inicio.toISOString(),
      hasta: fin.toISOString(),
      estado: "programado",
      cliente_nombre: "Cliente Demo",
      cliente_contacto: "111-222",
    });
  }

  for (let i = 1; i <= 15; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    day.setHours(9 + (i % 6), 0, 0, 0);
    const serv = db.servicios[i % db.servicios.length];
    addTurno(day, serv);
  }

  localStorage.setItem(KEY, JSON.stringify(db));
  alert(" Seed mock creada: 15 turnos históricos + servicios/horarios básicos");
})();


Con esto, Servicios, Horarios, Agenda del día y Estadísticas ya tienen datos para el video.

 Opción B — FULL-STACK (Backend FastAPI + Frontend Real)
1) Backend (FastAPI)

Entrá a /backend y creá un venv:

python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/Mac
source .venv/bin/activate


Instalá dependencias:

pip install -r requirements.txt


Si tu requirements.txt está en UTF-16 y tu editor lo muestra raro, no pasa nada: pip igual lo instala. Paquetes clave:

fastapi==0.114.2
starlette==0.38.6
uvicorn[standard]==0.30.6
SQLAlchemy==2.0.35
pydantic==2.9.2
pydantic-core==2.23.4
pydantic-settings==2.11.0
python-multipart==0.0.20
bcrypt==4.2.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.1
email-validator==2.1.0.post1
Jinja2==3.1.4
python-jose[cryptography]==3.3.0


Creá un .env (opcional; valores por defecto ya funcionan con SQLite):

# backend/.env
SECRET_KEY=dev-secret-change-me
DATABASE_URL=sqlite:///./basedatos.db
ORIGINS=http://127.0.0.1:5173,http://localhost:5173


(Inicialización rápida de tablas + demo mínima)

# crea tablas y datos demo básicos (usuario 'demo', emprendedor, servicios, algunos horarios)
python init_db_and_seed_demo.py


Levantá la API:

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Seeds HTTP (muestran TODO en Estadísticas)

Con el backend corriendo, en otra terminal (mismo venv):

# (opcional) export TURNATE_API_URL si no es el default
# Windows (PowerShell): $env:TURNATE_API_URL="http://127.0.0.1:8000"
# Linux/Mac: export TURNATE_API_URL="http://127.0.0.1:8000"

python seed_backend.py


Este seed hace:

Crea usuarios:

Emprendedor: mirko / mirko123

Cliente: cliente1 / cliente123

Activa plan de emprendedor y genera código público.

Carga Servicios con precio (para Estadísticas):

Corte clásico (30m, $5000)

Barba (20m, $3000)

Corte + Barba (45m, $7500)

Color (90m, $15000)

Carga Horarios Lunes-Sábado 09–13 y 15–20.

Genera ~20 turnos (10 pasados + 9 próximos) con estados variados.

Al final te imprime las credenciales y (si la API lo devuelve) el código público para la vista pública.
Tip: si necesitás el código desde el back/UX, buscá en Emprendimiento del panel o pegale a GET /emprendedores/mi.

Endpoints útiles para probar rápido (con token):

POST /usuarios/login → devuelve { token, user }

POST /usuarios/activar_emprendedor (o /emprendedores/activar)

POST /emprendedores/generar-codigo (o variantes del seed)

GET /servicios/mis, POST /servicios

GET /horarios/mis, POST /horarios

GET /turnos/mis?desde=YYYY-MM-DD&hasta=YYYY-MM-DD, POST /turnos, PATCH /turnos/:id

Healthcheck: GET /health → { "status": "ok" }

2) Frontend (Vite + React + Tailwind)

Ir a /frontend e instalar:

npm install


Configurar la URL de la API en .env:

# frontend/.env
VITE_API_URL=http://127.0.0.1:8000


Usar API real (desactivar mock): en src/services/api.js poné:

- const MOCK = true; // Dejalo true para probar sin backend
+ const MOCK = false; // usar backend real


Correr:

npm run dev


Logins de demo:

Dueño: mirko / mirko123

Cliente: cliente1 / cliente123

(Semilla mínima) demo / demo (si tu script lo creó con esa clave)

Vista pública (código del emprendedor):

Buscalo en el panel Emprendimiento o por API:

GET /emprendedores/mi (logueado como mirko)

Abrí en el navegador:
http://127.0.0.1:5173/reservar/<CODIGO>

🧪 Flujo de demo (≤ 2 minutos)

Dueño logueado → Panel: ver Servicios (ya cargados), Horarios (cargados), botón de Código público (copiar).

Vista pública en incógnito → /:codigo → elegir Servicio + hora → Confirmar.

Volver a Dueño → Agenda del día → aparece la reserva.

(Opcional) Estadísticas → ya muestra ingresos por servicio/mes gracias a los seeds.

Reset / Problemas comunes

Reset Mock: localStorage.removeItem("turnate_mock_db") y refrescá.

Reset DB (SQLite): borrá el archivo basedatos.db (o turnate.db si lo usás) y corré init_db_and_seed_demo.py de nuevo.

CORS: si el frontend usa otro host/puerto, agregalo en ORIGINS del .env del backend.

401/403: asegurate de enviar Authorization: Bearer <token> en llamadas protegidas (el front lo hace automáticamente tras login).

 Resumen de credenciales (seeds)

Emprendedor: mirko / mirko123

Cliente: cliente1 / cliente123

Código público: generado por el seed (lo ves en consola del seed o en Emprendimiento).

Mock (sin backend): código fijo ABC123