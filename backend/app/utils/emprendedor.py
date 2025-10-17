import random
import string
from sqlalchemy.orm import Session
from app import models

# Evitamos caracteres confusos como O/0/I/1
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

def generate_unique_cliente_code(db: Session, length: int = 8) -> str:
    """Genera un código público único para Emprendedor."""
    while True:
        code = "".join(random.choices(ALPHABET, k=length))
        exists = db.query(models.Emprendedor).filter(models.Emprendedor.codigo_cliente == code).first()
        if not exists:
            return code

def ensure_emprendedor_for_user(db: Session, user: models.Usuario) -> models.Emprendedor:
    """Obtiene o crea (idempotente) el Emprendedor del usuario. Garantiza codigo_cliente."""
    emp = db.query(models.Emprendedor).filter(models.Emprendedor.usuario_id == user.id).first()
    if emp:
        if not getattr(emp, "codigo_cliente", None):
            emp.codigo_cliente = generate_unique_cliente_code(db)
            db.add(emp)
            db.commit()
            db.refresh(emp)
        return emp

    default_name = (
        getattr(user, "username", None)
        or getattr(user, "email", None)
        or f"Mi Negocio {user.id}"
    )

    # Armamos kwargs tolerantes a diferencias de modelo (negocio vs nombre, activo opcional)
    kwargs = dict(
        usuario_id=user.id,
        descripcion="",
        codigo_cliente=generate_unique_cliente_code(db),
    )
    if hasattr(models.Emprendedor, "negocio"):
        kwargs["negocio"] = default_name
    if hasattr(models.Emprendedor, "nombre"):
        kwargs["nombre"] = default_name
    if hasattr(models.Emprendedor, "activo"):
        kwargs["activo"] = True

    emp = models.Emprendedor(**kwargs)
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

def regenerate_public_code(db: Session, emprendedor: models.Emprendedor) -> models.Emprendedor:
    """Asigna un nuevo codigo_cliente único."""
    emprendedor.codigo_cliente = generate_unique_cliente_code(db)
    db.add(emprendedor)
    db.commit()
    db.refresh(emprendedor)
    return emprendedor

def is_user_emprendedor(db: Session, user: models.Usuario) -> bool:
    return db.query(models.Emprendedor).filter(models.Emprendedor.usuario_id == user.id).first() is not None
