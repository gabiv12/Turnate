from sqlalchemy import create_engine
from app.config import settings
engine = create_engine(settings.DATABASE_URL, future=True)
with engine.begin() as conn:
    rows = conn.exec_driver_sql("PRAGMA table_info(usuarios);").fetchall()
    print("Columnas en usuarios:")
    for r in rows:
        print("-", r[1])

