# app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import admin_lite 
from app.database import engine
from app import models
from app.routers import usuarios, emprendedores, servicios, horarios, turnos
from app.routers import public_agenda
from app.routers import public_servicios 
# ---------- App ----------
app = FastAPI(title="Turnate API")
app.include_router(public_agenda.router)
# ---------- CORS ----------
# Podés setear ORIGINS por env separado por comas. Ej:
# ORIGINS=http://localhost:5173,http://127.0.0.1:5173
origins_env = os.getenv("ORIGINS")
if origins_env:
    ALLOW_ORIGINS = [o.strip() for o in origins_env.split(",") if o.strip()]
else:
    # Por defecto permitimos localhost de Vite y cualquier 127.0.0.1
    ALLOW_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Modelos y tablas ----------
models.Base.metadata.create_all(bind=engine)

# ---------- Routers ----------
app.include_router(admin_lite.router)
app.include_router(usuarios.router)
app.include_router(emprendedores.router)
app.include_router(servicios.router)
app.include_router(horarios.router)
app.include_router(turnos.router)
app.include_router(public_agenda.router)
app.include_router(public_servicios.router)
# ---------- Health check ----------
@app.get("/health")
def health():
    return {"status": "ok"}
