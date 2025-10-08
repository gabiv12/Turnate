# app/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Puedes setear DATABASE_URL en el entorno.
# Ejemplos:
#   sqlite (local): sqlite:///./turnate.db
#   postgres:       postgresql+psycopg2://user:pass@localhost:5432/turnate
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./turnate.db")

# SQLite necesita este connect_args para threads con Uvicorn --reload en Windows
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependencia FastAPI: sesión por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
