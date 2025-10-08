from app.database import SessionLocal
from app import models
from passlib.context import CryptContext
ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = SessionLocal()
u = db.query(models.Usuario).filter_by(username="demo").first()
print("Usuario demo existe:", bool(u))
if u:
    print("Campos disponibles:", [c for c in dir(u) if not c.startswith('_')])
    # intenta verificar bcrypt si hay hash
    val = getattr(u, "password_hash", None)
    if val:
        try:
            print("bcrypt verify:", ctx.verify("demo", val))
        except Exception as e:
            print("bcrypt error:", e)
    # muestra legados en texto plano si existen
    for attr in ("password", "contrasenia", "contrasena"):
        if hasattr(u, attr):
            print(attr, "=", getattr(u, attr))
db.close()
