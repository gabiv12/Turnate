# app/crud/horarios.py
from sqlalchemy.orm import Session
from app.models import Horario
from app.schemas import HorarioCreate

def get_horarios(db: Session, emprendedor_id: int):
    return db.query(Horario).filter(Horario.emprendedor_id == emprendedor_id).all()

def create_horario(db: Session, emprendedor_id: int, horario: HorarioCreate):
    db_horario = Horario(**horario.dict(), emprendedor_id=emprendedor_id)
    db.add(db_horario)
    db.commit()
    db.refresh(db_horario)
    return db_horario

def update_horario(db: Session, horario_id: int, horario: HorarioCreate):
    db_horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not db_horario:
        return None
    for key, value in horario.dict().items():
        setattr(db_horario, key, value)
    db.commit()
    db.refresh(db_horario)
    return db_horario

def delete_horario(db: Session, horario_id: int):
    db_horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not db_horario:
        return None
    db.delete(db_horario)
    db.commit()
    return True