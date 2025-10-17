# app/config.py
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os

class Settings(BaseSettings):
    # --- App ---
    PROJECT_NAME: str = Field(default="Turnate API")
    API_PREFIX: str = Field(default="")

    # --- Auth / JWT ---
    SECRET_KEY: str = Field(default_factory=lambda: os.environ.get("SECRET_KEY", "TURNATE_DEV_SECRET_CHANGE_ME"))
    ALGORITHM: str = Field(default_factory=lambda: os.environ.get("ALGORITHM", "HS256"))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default_factory=lambda: int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")))

    # --- DB ---
    DATABASE_URL: str = Field(default="sqlite:///./basedatos.db")

    # --- CORS (como string separado por comas o "*")
    CORS_ALLOW_ORIGINS: str = Field(default_factory=lambda: os.environ.get("CORS_ALLOW_ORIGINS", "*"))

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()

# ===== Aliases a nivel de módulo (lo que importan otros módulos) =====
SECRET_KEY: str = settings.SECRET_KEY
ALGORITHM: str = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES: int = settings.ACCESS_TOKEN_EXPIRE_MINUTES
DATABASE_URL: str = settings.DATABASE_URL

# CORS como lista (para CORSMiddleware)
if settings.CORS_ALLOW_ORIGINS == "*":
    CORS_ALLOW_ORIGINS_LIST: List[str] = ["*"]
else:
    CORS_ALLOW_ORIGINS_LIST: List[str] = [
        o.strip() for o in settings.CORS_ALLOW_ORIGINS.split(",") if o.strip()
    ]

# Alias común que suelen usar en main.py
CORS_ALLOW_ORIGINS: List[str] = CORS_ALLOW_ORIGINS_LIST
