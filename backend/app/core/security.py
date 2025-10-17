# app/core/security.py
from app.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    get_user_id_from_token,
)
from app.config import settings

# Reexportamos las constantes por compatibilidad con imports viejos
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

__all__ = [
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "decode_access_token",
    "get_user_id_from_token",
    "SECRET_KEY",
    "ALGORITHM",
]
