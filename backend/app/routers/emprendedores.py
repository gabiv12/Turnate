# app/routers/emprendedores.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app import models
from sqlalchemy import func, or_

router = APIRouter(prefix="/emprendedores", tags=["Emprendedores"])

def _generate_unique_code(db: Session) -> str:
    import random, string
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        Emp = models.Emprendedor
        # Detecta la columna de código disponible
        code_col = getattr(Emp, "codigo_cliente", None) or getattr(Emp, "codigo", None) or getattr(Emp, "code", None)
        if code_col is None:
            return code  # si tu tabla no tiene columna de código, igual devolvemos uno
        exists = db.query(Emp).filter(code_col == code).first()
        if not exists:
            return code

def _serialize_emp(e) -> dict:
    def g(name, default=""):
        val = getattr(e, name, None)
        return default if val is None else val
    return {
        "id": g("id", None),
        "usuario_id": g("usuario_id", None),
        "codigo_cliente": g("codigo_cliente") or g("codigo") or g("code"),
        "nombre": g("nombre"),
        "nombre_negocio": g("nombre_negocio"),
        "telefono_contacto": g("telefono_contacto"),
        "direccion": g("direccion"),
        "descripcion": g("descripcion"),
        "whatsapp": g("whatsapp"),
        "instagram": g("instagram"),
        "facebook": g("facebook"),
        "web": g("web"),
        "logo_url": g("logo_url"),
        "banner_url": g("banner_url"),
    }

@router.get("/mi")
def mi_emprendimiento(db: Session = Depends(get_db), user=Depends(get_current_user)):
    Emp = models.Emprendedor
    e = db.query(Emp).filter(Emp.usuario_id == user.id).first()
    if not e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No sos emprendedor")
    return _serialize_emp(e)

@router.put("/mi")
def actualizar_mi_emprendimiento(
    datos: dict = Body(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    Emp = models.Emprendedor
    e = db.query(Emp).filter(Emp.usuario_id == user.id).first()
    if not e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No sos emprendedor")

    allowed = {c.name for c in Emp.__table__.columns}
    for k, v in (datos or {}).items():
        if k in allowed:
            setattr(e, k, v)

    db.add(e)
    db.commit()
    db.refresh(e)
    return _serialize_emp(e)

@router.post("/activar")
def activar_emprendedor(db: Session = Depends(get_db), user=Depends(get_current_user)):
    Emp = models.Emprendedor

    # Si ya existe, devolvémoslo
    existente = db.query(Emp).filter(Emp.usuario_id == user.id).first()
    if existente:
        return {
            "detail": "Ya eras emprendedor",
            "emprendedor": _serialize_emp(existente),
        }

    # Crear nuevo emprendedor con solo columnas válidas
    allowed = {c.name for c in Emp.__table__.columns}
    data = {"usuario_id": user.id}

    # Código público si tenés columna
    code = _generate_unique_code(db)
    if "codigo_cliente" in allowed:
        data["codigo_cliente"] = code
    elif "codigo" in allowed:
        data["codigo"] = code
    elif "code" in allowed:
        data["code"] = code

    # Inicializamos algunos campos si existen (evita Nones)
    for field in (
        "nombre", "nombre_negocio", "telefono_contacto", "direccion",
        "descripcion", "whatsapp", "instagram", "facebook", "web",
        "logo_url", "banner_url"
    ):
        if field in allowed and field not in data:
            data[field] = ""

    e = Emp(**data)  # type: ignore[arg-type]
    db.add(e)

    # (Opcional) marcar rol de usuario si existe la columna
    try:
        if hasattr(user, "rol"):
            user.rol = "emprendedor"
            db.add(user)
    except Exception:
        pass

    db.commit()
    db.refresh(e)

    return {
        "detail": "Emprendedor activado",
        "emprendedor": _serialize_emp(e),
    }

# ===========================
# NUEVO: buscar por código (case/space-insensitive y soporta codigo_cliente/codigo/code)
# ===========================
@router.get("/by-codigo/{codigo}")
def get_by_codigo(codigo: str, db: Session = Depends(get_db)):
    Emp = models.Emprendedor
    code = codigo.strip().upper()

    conds = []
    for attr in ("codigo_cliente", "codigo", "code"):
        col = getattr(Emp, attr, None)
        if col is not None:
            conds.append(func.upper(func.trim(col)) == code)

    if not conds:
        # No hay columna de código en el modelo
        raise HTTPException(status_code=404, detail="Emprendedor no encontrado")

    emp = db.query(Emp).filter(or_(*conds)).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Emprendedor no encontrado")

    return _serialize_emp(emp)
