from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.deps import get_current_user
from app import models
from app.schemas import HorarioCreate, HorarioUpdate, HorarioOut
from app.crud.horarios import get_horarios, create_horario, update_horario, delete_horario

router = APIRouter(prefix="/horarios", tags=["horarios"])

def _require_emprendedor(db: Session, user: models.Usuario) -> models.Emprendedor:
    emp = db.query(models.Emprendedor).filter(models.Emprendedor.usuario_id == user.id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo para emprendedores")
    return emp

@router.get("/mis", response_model=list[HorarioOut])
def listar_mis_horarios(db: Session = Depends(get_db), user: models.Usuario = Depends(get_current_user)):
    emp = _require_emprendedor(db, user)
    return get_horarios(db, emp.id)

@router.post("", response_model=HorarioOut, status_code=201)
def crear_mi_horario(payload: HorarioCreate, db: Session = Depends(get_db), user: models.Usuario = Depends(get_current_user)):
    emp = _require_emprendedor(db, user)
    return create_horario(db, emp.id, payload)

@router.put("/{horario_id}", response_model=HorarioOut)
def actualizar_mi_horario(horario_id: int, payload: HorarioUpdate, db: Session = Depends(get_db), user: models.Usuario = Depends(get_current_user)):
    emp = _require_emprendedor(db, user)
    updated = update_horario(db, horario_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return updated

@router.delete("/{horario_id}", status_code=204)
def eliminar_mi_horario(horario_id: int, db: Session = Depends(get_db), user: models.Usuario = Depends(get_current_user)):
    emp = _require_emprendedor(db, user)
    ok = delete_horario(db, horario_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return None
