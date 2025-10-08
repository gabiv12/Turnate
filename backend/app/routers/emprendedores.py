from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.deps import get_current_user

router = APIRouter(prefix="/emprendedores", tags=["emprendedores"])

@router.get("/mi", dependencies=[Depends(get_current_user)])
def mi_emprendedor(db: Session = Depends(get_db), user = Depends(get_current_user)):
    # devolver/asegurar emprendedor del user.id
    return {}
