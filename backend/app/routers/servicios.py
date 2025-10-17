from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.deps import get_current_user
from app import models
from app.schemas import ServicioCreate, ServicioUpdate, ServicioOut

router = APIRouter(prefix="/servicios", tags=["servicios"])

def _require_emprendedor(db: Session, user: models.Usuario) -> models.Emprendedor:
    emp = db.query(models.Emprendedor).filter(models.Emprendedor.usuario_id == user.id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo para emprendedores")
    return emp

@router.get("/mis", response_model=list[ServicioOut])
def listar_mis_servicios(db: Session = Depends(get_db), user: models.Usuario = Depends(get_current_user)):
    emp = _require_emprendedor(db, user)
    return db.query(models.Servicio).filter(models.Servicio.emprendedor_id == emp.id).order_by(models.Servicio.nombre.asc()).all()

@router.post("", response_model=ServicioOut, status_code=201)
def crear_servicio(payload: ServicioCreate, db: Session = Depends(get_db), user: models.Usuario = Depends(get_current_user)):
    emp = _require_emprendedor(db, user)
    srv = models.Servicio(
        emprendedor_id=emp.id,
        nombre=payload.nombre,
        duracion_min=payload.duracion_min,
        precio=payload.precio,
        activo=payload.activo
    )
    db.add(srv)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="Nombre de servicio duplicado")
    db.refresh(srv)
    return srv

@router.put("/{servicio_id}", response_model=ServicioOut)
def actualizar_servicio(servicio_id: int, payload: ServicioUpdate, db: Session = Depends(get_db), user: models.Usuario = Depends(get_current_user)):
    emp = _require_emprendedor(db, user)
    srv = db.query(models.Servicio).filter(
        models.Servicio.id == servicio_id,
        models.Servicio.emprendedor_id == emp.id
    ).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(srv, field, value)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicto al actualizar servicio")
    db.refresh(srv)
    return srv

@router.delete("/{servicio_id}", status_code=204)
def eliminar_servicio(servicio_id: int, db: Session = Depends(get_db), user: models.Usuario = Depends(get_current_user)):
    emp = _require_emprendedor(db, user)
    srv = db.query(models.Servicio).filter(
        models.Servicio.id == servicio_id,
        models.Servicio.emprendedor_id == emp.id
    ).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    db.delete(srv)
    db.commit()
    return None
