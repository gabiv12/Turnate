# app/utils/emprendedor.py
import random
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models

ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # sin O, I, L, 0, 1 para evitar confusiones

def generate_unique_cliente_code(db: Session, length: int = 6) -> str:
    """
    Genera un código alfanumérico único (ej: AHTW7X).
    """
    for _ in range(50):
        code = "".join(random.choice(ALPHABET) for _ in range(length))
        exists = (
            db.query(models.Emprendedor)
            .filter(func.upper(models.Emprendedor.codigo_cliente) == code)
            .first()
        )
        if not exists:
            return code
    raise RuntimeError("No se pudo generar un código único. Intenta de nuevo.")

def ensure_emprendedor_for_user(db: Session, usuario_id: int) -> models.Emprendedor:
    """
    Devuelve el Emprendedor del usuario. Si no existe, lo crea con datos válidos.
    Si no tiene codigo_cliente, se genera uno.
    Soporta ambos esquemas de Emprendedor.
    """
    # 1) Si ya existe, devolvemos
    e = (
        db.query(models.Emprendedor)
        .filter(models.Emprendedor.usuario_id == usuario_id)
        .first()
    )
    if e:
        # Aseguramos que tenga código (sin reemplazar uno existente)
        if not getattr(e, "codigo_cliente", None):
            e.codigo_cliente = generate_unique_cliente_code(db)
            db.commit()
            db.refresh(e)
        return e

    # 2) Tomamos datos del usuario para defaults legibles
    u = None
    try:
        u = db.get(models.Usuario, usuario_id)  # SQLAlchemy 1.4+
    except Exception:
        u = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()

    username_o_email = (u.username if u and u.username else None) or (u.email if u else None)

    # Fallbacks legibles
    negocio_defecto = username_o_email or f"Negocio {usuario_id}"
    nombre_defecto = username_o_email or f"Usuario {usuario_id}"

    # 3) Armamos kwargs según columnas disponibles en el modelo actual
    kwargs = {"usuario_id": usuario_id}

    if hasattr(models.Emprendedor, "negocio"):
        kwargs["negocio"] = negocio_defecto

    if hasattr(models.Emprendedor, "descripcion"):
        kwargs["descripcion"] = None

    if hasattr(models.Emprendedor, "codigo_cliente"):
        kwargs["codigo_cliente"] = generate_unique_cliente_code(db)

    # Compatibilidad con esquema antiguo
    if hasattr(models.Emprendedor, "nombre"):
        kwargs["nombre"] = nombre_defecto
    if hasattr(models.Emprendedor, "apellido"):
        kwargs["apellido"] = ""

    # 4) Creamos y devolvemos
    e = models.Emprendedor(**kwargs)
    db.add(e)
    db.commit()
    db.refresh(e)
    return e
