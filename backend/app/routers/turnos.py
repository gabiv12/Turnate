# app/routers/turnos.py
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.deps import get_current_user
from app import models
from app.schemas import TurnoOut

router = APIRouter(prefix="/turnos", tags=["turnos"])


# ----------------------------
# Helpers
# ----------------------------
def _parse_dt(v: Optional[str | datetime]) -> Optional[datetime]:
    """Acepta datetime o ISO string. Soporta 'Z'. Devuelve naive (UTC)."""
    if v is None:
        return None
    if isinstance(v, datetime):
        # lo dejamos naive
        return v.replace(tzinfo=None)
    s = str(v).strip()
    if not s:
        return None
    try:
        # manejar trailing Z
        if s.endswith("Z"):
            s = s.replace("Z", "+00:00")
        d = datetime.fromisoformat(s)
        return d.replace(tzinfo=None)
    except Exception:
        # intento fallback YYYY-MM-DD HH:MM
        try:
            return datetime.strptime(s[:16], "%Y-%m-%dT%H:%M")
        except Exception:
            return None


def _resolve_emprendedor_id(
    db: Session, emprendedor_id: Optional[int], emprendedor_codigo: Optional[str]
) -> int:
    if emprendedor_id:
        return int(emprendedor_id)
    if emprendedor_codigo:
        emp = (
            db.query(models.Emprendedor)
            .filter(models.Emprendedor.codigo_cliente == str(emprendedor_codigo).upper())
            .first()
        )
        if not emp:
            raise HTTPException(status_code=404, detail="Emprendedor no encontrado")
        return int(emp.id)
    raise HTTPException(status_code=422, detail="Falta emprendedor_id o emprendedor_codigo")


def _duracion_por_servicio(db: Session, servicio_id: Optional[int]) -> int:
    """Devuelve duración en minutos. Default 30 si no hay servicio."""
    if not servicio_id:
        return 30
    s = db.query(models.Servicio).filter(models.Servicio.id == int(servicio_id)).first()
    try:
        return int(getattr(s, "duracion_min", 30)) if s else 30
    except Exception:
        return 30


def _coalesce(*vals):
    for v in vals:
        if v is not None:
            return v
    return None


# ----------------------------
# Listados (privado del usuario)
# ----------------------------
@router.get("/mis", response_model=List[TurnoOut])
def turnos_mis(
    desde: Optional[datetime] = Query(default=None),
    hasta: Optional[datetime] = Query(default=None),
    db: Session = Depends(get_db),
    user: models.Usuario = Depends(get_current_user),
):
    d = _parse_dt(desde)
    h = _parse_dt(hasta)
    q = db.query(models.Turno).filter(models.Turno.cliente_id == user.id)
    if d:
        q = q.filter(models.Turno.inicio >= d)
    if h:
        q = q.filter(models.Turno.inicio <= h)
    q = q.order_by(models.Turno.inicio.asc())
    return q.all()


@router.get("/owner", response_model=List[TurnoOut])
def turnos_owner(
    desde: Optional[datetime] = Query(default=None),
    hasta: Optional[datetime] = Query(default=None),
    db: Session = Depends(get_db),
    user: models.Usuario = Depends(get_current_user),
):
    emp = db.query(models.Emprendedor).filter(models.Emprendedor.usuario_id == user.id).first()
    if not emp:
        return []
    d = _parse_dt(desde)
    h = _parse_dt(hasta)
    q = db.query(models.Turno).filter(models.Turno.emprendedor_id == emp.id)
    if d:
        q = q.filter(models.Turno.inicio >= d)
    if h:
        q = q.filter(models.Turno.inicio <= h)
    q = q.order_by(models.Turno.inicio.asc())
    return q.all()


# ----------------------------
# Listado público por código (para Reservar.jsx)
# ----------------------------
@router.get("/de/{codigo}", response_model=List[TurnoOut])
def turnos_publicos_por_codigo(
    codigo: str,
    desde: Optional[datetime] = Query(default=None),
    hasta: Optional[datetime] = Query(default=None),
    db: Session = Depends(get_db),
):
    emp = (
        db.query(models.Emprendedor)
        .filter(models.Emprendedor.codigo_cliente == str(codigo).upper())
        .first()
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Emprendedor no encontrado")

    d = _parse_dt(desde)
    h = _parse_dt(hasta)

    q = db.query(models.Turno).filter(models.Turno.emprendedor_id == emp.id)
    if d:
        q = q.filter(models.Turno.inicio >= d)
    if h:
        q = q.filter(models.Turno.inicio <= h)
    q = q.order_by(models.Turno.inicio.asc())
    return q.all()


# ----------------------------
# Crear (compat) — flexible para front
# ----------------------------
@router.post("/compat", response_model=TurnoOut, status_code=201)
def crear_turno_compat(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    user: models.Usuario = Depends(get_current_user),
):
    """
    Acepta:
      - { datetime } o { inicio, fin } o { desde, hasta }
      - { servicio_id } (puede venir "", lo convertimos a None)
      - { emprendedor_id } o { emprendedor_codigo }
      - ignora 'notas' si llega (no existe en el modelo)
    """
    # emprendedor
    emp_id = _resolve_emprendedor_id(db, payload.get("emprendedor_id"), payload.get("emprendedor_codigo"))

    # servicio id robusto
    sid = payload.get("servicio_id", None)
    try:
        sid = int(sid) if sid not in (None, "") else None
    except Exception:
        sid = None

    # fechas
    inicio = _coalesce(
        _parse_dt(payload.get("datetime")),
        _parse_dt(payload.get("inicio")),
        _parse_dt(payload.get("desde")),
    )
    if not inicio:
        raise HTTPException(status_code=422, detail="Falta 'datetime' o 'inicio'")

    fin = _coalesce(
        _parse_dt(payload.get("fin")),
        _parse_dt(payload.get("hasta")),
    )
    if not fin:
        fin = inicio + timedelta(minutes=_duracion_por_servicio(db, sid))

    # colisión simple (capacidad 1 por bloque+servicio)
    q_slot = db.query(models.Turno).filter(
        models.Turno.emprendedor_id == emp_id,
        models.Turno.inicio == inicio,
    )
    if sid:
        q_slot = q_slot.filter(models.Turno.servicio_id == sid)
    if q_slot.first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese horario ya está reservado")

    # evitar duplicado exacto del cliente
    ya_tiene = db.query(models.Turno).filter(
        models.Turno.cliente_id == user.id,
        models.Turno.emprendedor_id == emp_id,
        models.Turno.inicio == inicio,
    ).first()
    if ya_tiene:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya tenés un turno en ese horario")

    # estado por defecto (soporta enum si existe)
    estado_def = "confirmado"
    if hasattr(models, "EstadoTurno"):
        try:
            estado_def = models.EstadoTurno.confirmado
        except Exception:
            pass

    turno = models.Turno(
        emprendedor_id=emp_id,
        servicio_id=sid,
        cliente_id=user.id,
        inicio=inicio,
        fin=fin,
        estado=estado_def,
    )
    db.add(turno)
    db.commit()
    db.refresh(turno)
    return turno


# ----------------------------
# Crear "estricto" (por compat con front viejo) — redirige a compat
# ----------------------------
@router.post("", response_model=TurnoOut, status_code=201)
def crear_turno_estricto(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    user: models.Usuario = Depends(get_current_user),
):
    # Simplemente reutilizamos la lógica de /compat para evitar 422
    return crear_turno_compat(data, db, user)


# ----------------------------
# Editar / Posponer (PATCH)
# ----------------------------
@router.patch("/{turno_id}", response_model=TurnoOut)
def actualizar_turno(
    turno_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    user: models.Usuario = Depends(get_current_user),
):
    turno = db.query(models.Turno).filter(models.Turno.id == turno_id).first()
    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    # permisos: dueño del emprendimiento o cliente del turno
    emp = db.query(models.Emprendedor).filter(models.Emprendedor.id == turno.emprendedor_id).first()
    es_duenio = bool(emp and emp.usuario_id == user.id)
    es_cliente = bool(turno.cliente_id == user.id)
    if not (es_duenio or es_cliente):
        raise HTTPException(status_code=403, detail="Sin permiso para editar este turno")

    # servicio_id robusto
    raw_sid = data.get("servicio_id", "__KEEP__")
    if raw_sid == "__KEEP__":
        nuevo_servicio_id = turno.servicio_id
    elif raw_sid in ("", None):
        nuevo_servicio_id = None
    else:
        try:
            nuevo_servicio_id = int(raw_sid)
        except Exception:
            raise HTTPException(status_code=422, detail="servicio_id inválido")

    # fechas
    nuevo_inicio = _coalesce(
        _parse_dt(data.get("datetime")),
        _parse_dt(data.get("inicio")),
        turno.inicio,
    )
    nuevo_fin = _coalesce(
        _parse_dt(data.get("fin")),
        None,
    )
    if nuevo_fin is None:
        # recalcular si cambió inicio o servicio
        if (nuevo_inicio != turno.inicio) or (nuevo_servicio_id != turno.servicio_id):
            nuevo_fin = nuevo_inicio + timedelta(minutes=_duracion_por_servicio(db, nuevo_servicio_id))
        else:
            nuevo_fin = turno.fin

    # colisión si cambió bloque/servicio
    if (nuevo_inicio != turno.inicio) or (nuevo_servicio_id != turno.servicio_id):
        q = db.query(models.Turno).filter(
            models.Turno.emprendedor_id == turno.emprendedor_id,
            models.Turno.inicio == nuevo_inicio,
            models.Turno.id != turno.id,
        )
        if nuevo_servicio_id:
            q = q.filter(models.Turno.servicio_id == nuevo_servicio_id)
        if q.first():
            raise HTTPException(status_code=409, detail="Ese horario ya está reservado")

    # aplicar cambios válidos
    turno.inicio = nuevo_inicio
    turno.fin = nuevo_fin
    turno.servicio_id = nuevo_servicio_id

    if "estado" in data and data["estado"] is not None:
        turno.estado = data["estado"]

    # 'notas' puede venir del front pero el modelo no la tiene: la ignoramos.

    db.commit()
    db.refresh(turno)
    return turno


# ----------------------------
# Eliminar
# ----------------------------
@router.delete("/{turno_id}", status_code=204)
def eliminar_turno(
    turno_id: int,
    db: Session = Depends(get_db),
    user: models.Usuario = Depends(get_current_user),
):
    turno = db.query(models.Turno).filter(models.Turno.id == turno_id).first()
    if not turno:
        # idempotente
        return

    emp = db.query(models.Emprendedor).filter(models.Emprendedor.id == turno.emprendedor_id).first()
    es_duenio = bool(emp and emp.usuario_id == user.id)
    es_cliente = bool(turno.cliente_id == user.id)
    if not (es_duenio or es_cliente):
        raise HTTPException(status_code=403, detail="Sin permiso para borrar este turno")

    db.delete(turno)
    db.commit()
    return
