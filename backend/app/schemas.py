from datetime import datetime, time
from typing import Optional, List
from pydantic import BaseModel, Field, constr, ConfigDict  # ⬅️ agregamos ConfigDict

# ---------- Auth ----------
class TokenOut(BaseModel):
    token: str

class LoginIn(BaseModel):
    username: str
    password: str

# ---------- Usuario ----------
class UsuarioBase(BaseModel):
    username: constr(strip_whitespace=True, min_length=3)
    email: Optional[str] = None

class UsuarioCreate(UsuarioBase):
    password: constr(min_length=4)
    rol: str = "cliente"

class UsuarioUpdate(BaseModel):
    email: Optional[str] = None
    avatar_url: Optional[str] = None

class UsuarioOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    rol: str
    suscripcion_activa: bool = False

    # class Config: orm_mode = True   # ⬅️ v1 (quitado)
    model_config = ConfigDict(from_attributes=True)  # ⬅️ v2

# ---------- Emprendedor ----------
class EmprendedorBase(BaseModel):
    nombre: constr(strip_whitespace=True, min_length=1)
    descripcion: Optional[str] = None

class EmprendedorUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    codigo_cliente: Optional[str] = None
    activo: Optional[bool] = None

class EmprendedorOut(EmprendedorBase):
    id: int
    usuario_id: int
    codigo_cliente: Optional[str] = None
    activo: bool = True

    # class Config: orm_mode = True
    model_config = ConfigDict(from_attributes=True)

# ---------- Servicio ----------
class ServicioBase(BaseModel):
    nombre: constr(strip_whitespace=True, min_length=1)
    duracion_min: int = Field(30, ge=1, le=24*60)
    precio: int = Field(0, ge=0)  # centavos
    activo: bool = True

class ServicioCreate(ServicioBase):
    pass

class ServicioUpdate(BaseModel):
    nombre: Optional[str] = None
    duracion_min: Optional[int] = Field(None, ge=1, le=24*60)
    precio: Optional[int] = Field(None, ge=0)
    activo: Optional[bool] = None

class ServicioOut(ServicioBase):
    id: int
    emprendedor_id: int

    # class Config: orm_mode = True
    model_config = ConfigDict(from_attributes=True)

# ---------- Horario ----------
class HorarioBase(BaseModel):
    dia_semana: int = Field(..., ge=0, le=6)  # 0=Dom .. 6=Sab
    desde: time
    hasta: time
    activo: bool = True

class HorarioCreate(HorarioBase):
    pass

class HorarioUpdate(BaseModel):
    dia_semana: Optional[int] = Field(None, ge=0, le=6)
    desde: Optional[time] = None
    hasta: Optional[time] = None
    activo: Optional[bool] = None

class HorarioOut(HorarioBase):
    id: int
    emprendedor_id: int

    # class Config: orm_mode = True
    model_config = ConfigDict(from_attributes=True)

# ---------- Turno ----------
class TurnoBase(BaseModel):
    inicio: datetime
    fin: datetime
    servicio_id: Optional[int] = None
    cliente_id: Optional[int] = None
    cliente_nombre: Optional[str] = None
    cliente_contacto: Optional[str] = None
    estado: Optional[str] = "confirmado"      # pendiente/confirmado/cancelado

class TurnoCreate(TurnoBase):
    pass

class TurnoUpdate(BaseModel):
    inicio: Optional[datetime] = None
    fin: Optional[datetime] = None
    servicio_id: Optional[int] = None
    cliente_id: Optional[int] = None
    cliente_nombre: Optional[str] = None
    cliente_contacto: Optional[str] = None
    estado: Optional[str] = None
    motivo_cancelacion: Optional[str] = None

class TurnoOut(TurnoBase):
    id: int
    emprendedor_id: int
    precio_aplicado: Optional[int] = None
    motivo_cancelacion: Optional[str] = None

    # class Config: orm_mode = True
    model_config = ConfigDict(from_attributes=True)
