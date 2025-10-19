# backend/promote_admin.py
from app.database import SessionLocal
from app.models import Usuario  # ajustá el import si tu modelo se llama distinto
from sqlalchemy.orm import Session

def main():
    db: Session = SessionLocal()
    try:
        u = db.get(Usuario, 1)  # usuario id 1
        if not u:
            print("⚠️ Usuario id=1 no existe. Logueate/registre al menos un usuario primero.")
            return
        prev = getattr(u, "rol", None)
        u.rol = "admin"
        db.commit()
        db.refresh(u)
        print(f"✓ Listo. Usuario 1: rol '{prev}' → '{u.rol}'")
    finally:
        db.close()

if __name__ == "__main__":
    main()
