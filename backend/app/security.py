# app/security.py
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict
from jose import jwt, JWTError
from passlib.context import CryptContext

# Lee las constantes que expone app.config
from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

import logging
logger = logging.getLogger("security")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña en texto plano contra el hash almacenado."""
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Genera el hash (bcrypt) de la contraseña."""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un JWT firmado. Ejemplo de uso en tu login:
        token = create_access_token({"sub": str(user.id)})
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodifica el JWT. Devuelve None si es inválido/expirado."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        logger.warning("JWT decode failed: %s", e)
        return None


def get_user_id_from_token(token: str) -> Optional[int]:
    """Extrae el user id del campo sub/id/user_id si existe."""
    payload = decode_access_token(token)
    if not payload:
        return None
    sub = payload.get("sub") or payload.get("id") or payload.get("user_id")
    try:
        return int(sub) if sub is not None else None
    except Exception:
        return None
