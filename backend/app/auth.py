# app/auth.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import verify_password, create_access_token
from app import models

router = APIRouter(tags=["auth"])

def _find_user(db: Session, username: Optional[str], email: Optional[str]):
    user = None
    if email:
        try:
            user = db.query(models.Usuario).filter(models.Usuario.email == email).first()  # type: ignore[attr-defined]
        except Exception:
            pass
        if not user:
            try:
                user = db.query(models.User).filter(models.User.email == email).first()  # type: ignore[attr-defined]
            except Exception:
                pass
    if not user and username:
        try:
            user = db.query(models.Usuario).filter(models.Usuario.username == username).first()  # type: ignore[attr-defined]
        except Exception:
            pass
        if not user:
            try:
                user = db.query(models.User).filter(models.User.username == username).first()  # type: ignore[attr-defined]
            except Exception:
                pass
    return user

def _user_dict(u) -> dict:
    # normalizamos conceptos comunes
    return {
        "id": getattr(u, "id", None),
        "username": getattr(u, "username", None),
        "email": getattr(u, "email", None),
        "rol": getattr(u, "rol", None) or getattr(u, "role", None) or "cliente",
        "nombre": getattr(u, "nombre", None) or getattr(u, "name", None),
        "telefono": getattr(u, "telefono", None) or getattr(u, "phone", None),
        "avatar_url": getattr(u, "avatar_url", None) or getattr(u, "foto_url", None),
    }

@router.post("/usuarios/login")
@router.post("/auth/login")
def login(payload: dict, db: Session = Depends(get_db)):
    username = payload.get("username")
    email = payload.get("email")
    password = payload.get("password")
    if not password or not (username or email):
        raise HTTPException(status_code=422, detail="Faltan credenciales")

    user = _find_user(db, username, email)
    if not user or not verify_password(password, getattr(user, "hashed_password", "")):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": _user_dict(user)}
