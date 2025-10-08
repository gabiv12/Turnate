# init_db_and_seed_demo.py
from datetime import time
from passlib.context import CryptContext
from app.database import SessionLocal, engine, Base
from app import models

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

def main():
    # crear tablas
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Usuario demo
        u = db.query(models.Usuario).filter_by(username="demo").first()
        if not u:
            u = models.Usuario(
                username="demo",
                email="demo@example.com",
                rol="emprendedor",
                suscripcion_activa=True,
            )
            db.add(u)
            db.commit()
            db.refresh(u)

        # Forzamos password en hash y también columna legada si existe
        hashed = pwd.hash("demo")
        if hasattr(u, "password_hash"):
            u.password_hash = hashed
        # de paso dejamos texto plano en columna legada si existe (para máxima compat)
        if hasattr(u, "password"):
            u.password = "demo"
        if hasattr(u, "contrasenia"):
            u.contrasenia = "demo"
        if hasattr(u, "contrasena"):
            u.contrasena = "demo"

        u.rol = "emprendedor"
        u.suscripcion_activa = True
        db.commit()

        # Emprendedor
        e = db.query(models.Emprendedor).filter_by(usuario_id=u.id).first()
        if not e:
            e = models.Emprendedor(
                usuario_id=u.id,
                nombre="Demo Barber",
                descripcion="Cuenta de demostración",
                activo=True,
            )
            db.add(e)
            db.commit()
            db.refresh(e)

        # Servicios
        def ensure_serv(nombre, dur, precio_cent):
            s = db.query(models.Servicio).filter_by(emprendedor_id=e.id, nombre=nombre).first()
            if not s:
                s = models.Servicio(
                    emprendedor_id=e.id,
                    nombre=nombre,
                    duracion_min=dur,
                    precio=precio_cent,
                    activo=True,
                )
                db.add(s)
                db.commit()

        ensure_serv("Corte", 30, 3000 * 100)
        ensure_serv("Color", 60, 7000 * 100)

        # Horarios
        def ensure_h(dia, d, h):
            q = db.query(models.Horario).filter_by(emprendedor_id=e.id, dia_semana=dia, desde=d, hasta=h).first()
            if not q:
                q = models.Horario(emprendedor_id=e.id, dia_semana=dia, desde=d, hasta=h, activo=True)
                db.add(q)
                db.commit()

        ensure_h(1, time(9,0),  time(13,0))
        ensure_h(1, time(16,0), time(20,0))
        ensure_h(3, time(9,0),  time(13,0))
        print("🎉 Seed demo listo.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
