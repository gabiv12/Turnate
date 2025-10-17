Puesta en marcha
1) Backend
cd backend
python -m venv venv
venv\Scripts\Activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --reload-dir app


El backend queda en: http://localhost:8000.

2) Frontend
cd frontend
npm install


Crear archivo .env en frontend con la URL de la API:

VITE_API_BASE=http://localhost:8000


Correr el servidor de desarrollo:

npm run dev


La URL local aparecerá en la consola (por ejemplo http://localhost:5173).

Datos de ejemplo (seed demo)

El proyecto incluye un seed para cargar una cuenta de ejemplo con servicios y turnos.

Usuario demo

usuario: mirko

contraseña: admin1234

Ejecución del seed (PowerShell)

cd frontend
npm i axios
$env:API_BASE = "http://localhost:8000"
node .\seed-mirko.cjs


El seed:

registra o inicia sesión con mirko

activa el plan de emprendedor

crea servicios base

intenta generar turnos ilustrativos

Si la API exige emprendedor_id o emprendedor_codigo para crear turnos y devuelve 422, confirmá que el plan esté activo y que el endpoint acepte emprendedor_codigo.

Rutas principales (frontend)

/perfil – Perfil de usuario y activación del plan.

/emprendimiento – Datos del emprendimiento y código público.

/turnos – Gestión de turnos/servicios/horarios.

/estadisticas – KPIs y gráficos.

/reservar/<codigo> – Agenda pública para clientes.

Problemas comunes en Windows

403/401 al consultar recursos
Iniciá sesión y activá el plan desde /perfil o corré el seed.

404 al actualizar /usuarios/*
Algunas instalaciones no exponen endpoints de update. El frontend incluye fallbacks; verificá que al menos uno esté implementado en tu backend.

422 al crear turnos
Asegurate de enviar emprendedor_codigo o emprendedor_id según tu API.

El calendario no navega (Anterior/Siguiente/Hoy)
Este repo usa un calendario controlado con toolbar propia para evitar superposiciones. Si personalizás estilos, revisá src/components/Calendario.jsx y los estilos globales.
