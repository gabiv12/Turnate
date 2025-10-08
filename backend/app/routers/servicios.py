from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.deps import get_current_user

router = APIRouter(
    prefix="/servicios",
    tags=["servicios"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/mis")
def listar(db: Session = Depends(get_db), user = Depends(get_current_user)):
    return []

@router.post("")
def crear(payload: dict, db: Session = Depends(get_db), user = Depends(get_current_user)):
    return {}
