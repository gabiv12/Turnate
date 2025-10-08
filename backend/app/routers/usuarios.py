# app/routers/usuarios.py
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Usuario, RolUsuario  # ✅ archivo único models.py

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

# =======================
# Config / Security
# =======================
# ⚠️ Reemplazá este SECRET_KEY por uno propio
SECRET_KEY = "CHANGE_ME_SUPER_SECRET_KEY_32CHARS_MIN"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24h

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/usuarios/login")

# =======================
# DB Dependency
# =======================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =======================
# Schemas
# =======================
class UsuarioBase(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: Optional[EmailStr] = None

class UsuarioCreate(UsuarioBase):
    password: str = Field(min_length=6, max_length=128)
    rol: Optional[str] = "cliente"

    # v2
    @field_validator("rol", mode="before")
    @classmethod
    def validar_rol(cls, v):
        # Acepta "cliente"/"emprendedor" o instancia Enum; default cliente
        if v is None:
            return "cliente"
        if isinstance(v, str):
            v = v.strip().lower()
            return v if v in ("cliente", "emprendedor") else "cliente"
        try:
            return v.value  # Enum
        except Exception:
            return "cliente"

class UsuarioUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)

class UsuarioOut(BaseModel):
    id: int
    username: str
    email: Optional[EmailStr] = None
    rol: str
    avatar_url: Optional[str] = None
    suscripcion_activa: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class LoginIn(BaseModel):
    identifier: str  # username o email
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UsuarioOut

# =======================
# Helpers Auth
# =======================
def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_by_identifier(db: Session, identifier: str) -> Optional[Usuario]:
    q = db.query(Usuario)
    # busca por username primero, luego por email
    user = q.filter(Usuario.username == identifier).first()
    if not user and "@" in identifier:
        user = q.filter(Usuario.email == identifier).first()
    return user

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise credentials_error
    except JWTError:
        raise credentials_error

    user = get_user_by_identifier(db, sub)
    if not user:
        raise credentials_error
    return user

# =======================
# Endpoints
# =======================

@router.post("/", response_model=UsuarioOut, status_code=201)
def crear_usuario(data: UsuarioCreate, db: Session = Depends(get_db)):
    # Unicidad username/email
    if db.query(Usuario).filter(Usuario.username == data.username).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe.")
    if data.email and db.query(Usuario).filter(Usuario.email == data.email).first():
        raise HTTPException(status_code=400, detail="El email ya está en uso.")

    user = Usuario(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        rol=(data.rol if isinstance(data.rol, str) else data.rol.value),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = get_user_by_identifier(db, body.identifier)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Credenciales inválidas.")

    access_token = create_access_token({"sub": user.username})
    return TokenOut(access_token=access_token, user=user)

@router.get("/me", response_model=UsuarioOut)
def get_me(current: Usuario = Depends(get_current_user)):
    return current

@router.patch("/me", response_model=UsuarioOut)
def update_me(
    payload: UsuarioUpdate,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    # Validar unicidad si cambia username/email
    if payload.username and payload.username != current.username:
        if db.query(Usuario).filter(Usuario.username == payload.username).first():
            raise HTTPException(status_code=400, detail="Ese username ya existe.")
        current.username = payload.username

    if payload.email and payload.email != current.email:
        if db.query(Usuario).filter(Usuario.email == payload.email).first():
            raise HTTPException(status_code=400, detail="Ese email ya está en uso.")
        current.email = payload.email

    if payload.password:
        current.password_hash = hash_password(payload.password)

    db.add(current)
    db.commit()
    db.refresh(current)
    return current

@router.post("/activar_emprendedor", response_model=UsuarioOut)
def activar_emprendedor(
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    # Sube de rol y marca suscripción (simula pago)
    current.rol = RolUsuario.emprendedor.value
    current.suscripcion_activa = True
    db.add(current)
    db.commit()
    db.refresh(current)
    return current
