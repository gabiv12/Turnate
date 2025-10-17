# app/routers/public_agenda.py
from typing import List, Any
from datetime import datetime, time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

# Usamos el mismo prefijo que consume el front: /horarios/de/{codigo}
router = APIRouter(prefix="/horarios", tags=["horarios"])


# ---- Schemas públicos (horas como string para evitar errores Pydantic V2) ----
class HorarioPublicOut(BaseModel):
    id: int
    dia_semana: int
    hora_desde: str
    hora_hasta: str
    intervalo_min: int
    activo: bool = True


# ---- Utilidades internas -----------------------------------------------------
def _value_or(obj: Any, *keys: str, default=None):
    """
    Devuelve el primer atributo/campo no-nulo encontrado en obj
    (soporta objetos ORM y dicts).
    """
    for k in keys:
        if isinstance(obj, dict):
            if k in obj and obj[k] is not None:
                return obj[k]
        else:
            if hasattr(obj, k):
                v = getattr(obj, k)
                if v is not None:
                    return v
    return default


def _to_hhmm(v: Any) -> str:
    """
    Normaliza time/datetime/'HH:MM:SS' a 'HH:MM' (evita ValidationError).
    """
    if v is None:
        return "00:00"
    if isinstance(v, str):
        # "09:00:00" -> "09:00"
        return v[:5] if ":" in v else v
    if isinstance(v, datetime):
        return v.strftime("%H:%M")
    if isinstance(v, time):
        return v.strftime("%H:%M")
    try:
        return str(v)[:5]
    except Exception:
        return "00:00"


# ---- Endpoints públicos ------------------------------------------------------
@router.get("/de/{codigo}", response_model=List[HorarioPublicOut])
def get_horarios_by_codigo(codigo: str, db: Session = Depends(get_db)):
    """
    Devuelve los horarios públicos del emprendedor por código de cliente.
    Formatea hora_desde/hora_hasta como 'HH:MM' para Pydantic v2.
    """
    emp = (
        db.query(models.Emprendedor)
        .filter(models.Emprendedor.codigo_cliente == codigo)
        .first()
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Emprendedor no encontrado")

    rows = (
        db.query(models.Horario)
        .filter(models.Horario.emprendedor_id == emp.id)
        .all()
    )

    out: List[HorarioPublicOut] = []
    for h in rows:
        out.append(
            HorarioPublicOut(
                id=int(getattr(h, "id")),
                dia_semana=int(_value_or(h, "dia_semana", "diaSemana", default=0)),
                hora_desde=_to_hhmm(_value_or(h, "hora_desde", "desde", "horaDesde")),
                hora_hasta=_to_hhmm(_value_or(h, "hora_hasta", "hasta", "horaHasta")),
                intervalo_min=int(
                    _value_or(h, "intervalo_min", "intervalo", "intervaloMinutos", default=30)
                ),
                activo=bool(_value_or(h, "activo", default=True)),
            )
        )
    return out
