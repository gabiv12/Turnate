from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional

from app.database import get_db
from app import models

# Import flexible: usa core.security si existe; sino app.security
try:
    from app.core.security import get_password_hash, verify_password, create_access_token
except Exception:  # pragma: no cover
    from app.security import get_password_hash, verify_password, create_access_token  # type: ignore

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

# --------- helpers ---------
def _get_user_by_email_or_username(db: Session, email: Optional[str], username: Optional[str]) -> Optional[models.Usuario]:
    q = db.query(models.Usuario)
    if email:
        u = q.filter(models.Usuario.email == email).first()
        if u:
            return u
    if username:
        u = db.query(models.Usuario).filter(models.Usuario.username == username).first()
        if u:
            return u
    return None

def _user_to_dict(u: models.Usuario) -> dict:
    """No exponemos el hash. Hacemos salida que el front entiende."""
    d = {
        "id": getattr(u, "id", None),
        "username": getattr(u, "username", None),
        "email": getattr(u, "email", None),
        "rol": getattr(u, "rol", None) or getattr(u, "role", None) or "cliente",
    }
    # Mantener compatibilidad con claves antiguas
    return d

def _set_password(u: models.Usuario, raw_password: str):
    h = get_password_hash(raw_password)
    # tolerante al nombre del campo
    if hasattr(u, "hashed_password"):
        setattr(u, "hashed_password", h)
    elif hasattr(u, "password_hash"):
        setattr(u, "password_hash", h)
    else:
        # último recurso: campo 'password' en BD (no recomendado, pero común)
        setattr(u, "password", h)

def _get_password_hash_value(u: models.Usuario) -> Optional[str]:
    for attr in ("hashed_password", "password_hash", "password"):
        if hasattr(u, attr):
            return getattr(u, attr)
    return None

# --------- endpoints ---------

@router.post("/login")
def login(payload: dict, db: Session = Depends(get_db)):
    """
    Acepta:
      { "email": "...", "password": "..." }  ó  { "username": "...", "password": "..." }
    Devuelve:
      { "user": {...}, "token": "..." }  (y además "user_schema" por compatibilidad)
    """
    email = (payload.get("email") or "").strip() or None
    username = (payload.get("username") or "").strip() or None
    password = payload.get("password") or ""

    if not (email or username) or not password:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Email/usuario y contraseña son obligatorios")

    u = _get_user_by_email_or_username(db, email, username)
    if not u:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario no encontrado")

    stored = _get_password_hash_value(u)
    if not stored or not verify_password(password, stored):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Credenciales incorrectas")

    token = create_access_token({"sub": str(getattr(u, "id", ""))})
    user_out = _user_to_dict(u)

    return {"user": user_out, "user_schema": user_out, "token": token}


@router.post("/", status_code=status.HTTP_201_CREATED)
def registrar(payload: dict, db: Session = Depends(get_db)):
    """
    Acepta:
      { "username": "...", "email": "...", "password": "..." }
    Devuelve:
      { "user": {...} }
    """
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip()
    password = payload.get("password") or ""

    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="username, email y password son obligatorios")

    # Verificar duplicados
    if db.query(models.Usuario).filter(models.Usuario.username == username).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    if db.query(models.Usuario).filter(models.Usuario.email == email).first():
        raise HTTPException(status_code=400, detail="El email ya existe")

    # Crear usuario
    u_kwargs = {
        "username": username,
        "email": email,
    }
    # rol por defecto si existe campo
    if hasattr(models.Usuario, "rol"):
        u_kwargs["rol"] = "cliente"
    if hasattr(models.Usuario, "role"):
        u_kwargs["role"] = "cliente"

    u = models.Usuario(**u_kwargs)
    _set_password(u, password)

    try:
        db.add(u)
        db.commit()
        db.refresh(u)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Usuario o email duplicado")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="No se pudo registrar el usuario")

    return {"user": _user_to_dict(u)}


# Alias por compatibilidad: /usuarios/registro
@router.post("/registro", status_code=status.HTTP_201_CREATED)
def registrar_alias(payload: dict, db: Session = Depends(get_db)):
    return registrar(payload, db)
