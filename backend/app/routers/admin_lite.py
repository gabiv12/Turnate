# app/routers/admin_lite.py
from fastapi import APIRouter, Query
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sqlite3

from app.database import engine  # usamos el mismo archivo .db del proyecto

router = APIRouter(prefix="/admin-lite", tags=["admin-lite"])

# ---------- helpers ----------

def _db_path() -> str:
    # mismo archivo que usa SQLAlchemy
    p = engine.url.database
    if not p:
        # fallback relativo
        p = str(Path(__file__).resolve().parent / "database.db")
    return p

def _connect():
    conn = sqlite3.connect(_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def _parse_range(desde: str | None, hasta: str | None):
    # default: último mes (UTC)
    now = datetime.now(timezone.utc)
    if not desde or not hasta:
        first = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # fin de mes
        next_month = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
        last = next_month - timedelta(microseconds=1)
        return first.isoformat(), last.isoformat()

    # vienen en ISO "Z" o con offset => las usamos tal cual para sqlite
    return desde, hasta

# ---------- endpoints ----------

@router.get("/debug")
def debug():
    db = _db_path()
    try:
        with _connect() as cn:
            c = cn.cursor()
            tables = [r[0] for r in c.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            ).fetchall()]
    except Exception:
        tables = []
    return {"db_path": db, "tables": tables}

@router.get("/kpis")
def kpis(
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
):
    d, h = _parse_range(desde, hasta)

    with _connect() as cn:
        c = cn.cursor()

        # Totales (sin rango) para que nunca veas todo en 0
        tot_usuarios = c.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0]
        tot_emprs    = c.execute("SELECT COUNT(*) FROM emprendedores").fetchone()[0]
        tot_servs    = c.execute("SELECT COUNT(*) FROM servicios").fetchone()[0]
        tot_turnos   = c.execute("SELECT COUNT(*) FROM turnos").fetchone()[0]

        # Por rango (turnos y facturación)
        turnos_rango = c.execute(
            "SELECT COUNT(*) FROM turnos WHERE inicio BETWEEN ? AND ?",
            (d, h)
        ).fetchone()[0]

        cancelados = c.execute(
            "SELECT COUNT(*) FROM turnos WHERE estado='cancelado' AND inicio BETWEEN ? AND ?",
            (d, h)
        ).fetchone()[0]

        # ingresos = SUM(COALESCE(turnos.precio_aplicado, servicios.precio))
        ingresos = c.execute("""
            SELECT COALESCE(SUM(
              COALESCE(t.precio_aplicado, s.precio)
            ), 0)
            FROM turnos t
            LEFT JOIN servicios s ON s.id = t.servicio_id
            WHERE t.estado='confirmado' AND t.inicio BETWEEN ? AND ?
        """, (d, h)).fetchone()[0]

    return {
        # Por rango:
        "turnos": turnos_rango,
        "cancelados": cancelados,
        "ingresos": ingresos,  # en centavos si tus precios lo están (coherente con tu modelo)
        "desde": d, "hasta": h,
        # Totales:
        "usuarios_total": tot_usuarios,
        "emprendedores_total": tot_emprs,
        "servicios_total": tot_servs,
        "turnos_total": tot_turnos,
    }

@router.get("/servicios-agg")
def servicios_agg(
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
):
    d, h = _parse_range(desde, hasta)

    with _connect() as cn:
        c = cn.cursor()
        rows = c.execute("""
            SELECT
              s.id            AS servicio_id,
              s.nombre        AS nombre,
              COUNT(t.id)     AS cantidad,
              COALESCE(SUM(
                CASE
                  WHEN t.estado='confirmado'
                  THEN COALESCE(t.precio_aplicado, s.precio)
                  ELSE 0
                END
              ), 0)           AS ingresos
            FROM servicios s
            LEFT JOIN turnos t ON t.servicio_id = s.id
              AND t.inicio BETWEEN ? AND ?
            GROUP BY s.id, s.nombre
            ORDER BY cantidad DESC, ingresos DESC
        """, (d, h)).fetchall()

    return [dict(r) for r in rows]

@router.get("/turnos")
def turnos_list(
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
):
    d, h = _parse_range(desde, hasta)

    with _connect() as cn:
        c = cn.cursor()
        rows = c.execute("""
            SELECT
              t.id,
              t.inicio,
              t.fin,
              t.estado,
              t.cliente_nombre,
              t.cliente_contacto,
              COALESCE(t.precio_aplicado, s.precio) as precio,
              s.nombre        AS servicio_nombre,
              e.id            AS emprendedor_id,
              e.nombre        AS emprendedor_nombre
            FROM turnos t
            LEFT JOIN servicios s     ON s.id = t.servicio_id
            LEFT JOIN emprendedores e ON e.id = t.emprendedor_id
            WHERE t.inicio BETWEEN ? AND ?
            ORDER BY t.inicio DESC
            LIMIT ?
        """, (d, h, limit)).fetchall()

    return [dict(r) for r in rows]
