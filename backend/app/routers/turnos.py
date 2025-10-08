from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.deps import get_current_user

router = APIRouter(prefix="/turnos", tags=["turnos"])

@router.get("/mis", dependencies=[Depends(get_current_user)])
def turnos_mis(desde: str, hasta: str, db: Session = Depends(get_db), user = Depends(get_current_user)):
    return []

@router.post("", dependencies=[Depends(get_current_user)])
def crear_turno(payload: dict, db: Session = Depends(get_db), user = Depends(get_current_user)):
    return {}
