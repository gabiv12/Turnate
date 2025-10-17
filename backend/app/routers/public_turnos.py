# app/routers/public_turnos.py
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import TurnoOut

router = APIRouter(prefix="/turnos", tags=["turnos"])

@router.get("/de/{codigo}", response_model=List[TurnoOut])
def turnos_publicos_por_codigo(
    codigo: str,
    desde: Optional[datetime] = Query(default=None),
    hasta: Optional[datetime] = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Devuelve turnos del emprendedor identificado por 'codigo_cliente'.
    Filtra por 'inicio' usando 'desde' / 'hasta' si vienen.
    Excluye cancelados si existe el campo/enum 'estado'.
    """
    emp = (
        db.query(models.Emprendedor)
        .filter(models.Emprendedor.codigo_cliente == codigo)
        .first()
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Emprendedor no encontrado")

    q = db.query(models.Turno).filter(models.Turno.emprendedor_id == emp.id)

    if desde is not None:
        q = q.filter(models.Turno.inicio >= desde)
    if hasta is not None:
        q = q.filter(models.Turno.inicio <= hasta)

    if hasattr(models.Turno, "estado"):
        try:
            cancelado_val = getattr(models.EstadoTurno, "cancelado", "cancelado")
            q = q.filter(models.Turno.estado != cancelado_val)
        except Exception:
            q = q.filter(models.Turno.estado != "cancelado")

    q = q.order_by(models.Turno.inicio.asc())
    return q.all()
