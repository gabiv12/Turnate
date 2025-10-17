# app/deps.py
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import decode_access_token, get_user_id_from_token
from app import models


def _extract_token_from_request(request: Request) -> Optional[str]:
    """
    Extrae el token JWT desde:
      1) Authorization: Bearer <token>
      2) Cookie 'access_token'
      3) Header 'token' (fallback)
    """
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if isinstance(auth, str) and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()

    cookie_tok = request.cookies.get("access_token")
    if cookie_tok:
        return cookie_tok

    hd_tok = request.headers.get("token")
    if hd_tok:
        return hd_tok.strip()

    return None


def get_current_user(request: Request, db: Session = Depends(get_db)):
    """
    Valida el JWT y devuelve el usuario (ORM) asociado.
    """
    token = _extract_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta token",
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido/expirado",
        )

    # Intentamos obtener el user_id
    user_id = get_user_id_from_token(token) or payload.get("sub") or payload.get("id") or payload.get("user_id")
    try:
        user_id = int(user_id)  # type: ignore[arg-type]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido (sub)",
        )

    # Compatibilidad con nombre del modelo
    UserModel = getattr(models, "Usuario", None) or getattr(models, "User", None)
    if not UserModel:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Modelo de usuario no encontrado",
        )

    # Obtener usuario por ID (db.get si existe, si no .query)
    user = None
    try:
        user = db.get(UserModel, user_id)  # SQLAlchemy 1.4+
    except Exception:
        user = db.query(UserModel).filter(UserModel.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )

    return user


__all__ = ["get_current_user", "_extract_token_from_request"]
