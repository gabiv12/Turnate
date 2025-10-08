# app/config.py
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # --- App ---
    PROJECT_NAME: str = Field(default="Turnate API")
    API_PREFIX: str = Field(default="")

    # --- Auth / JWT ---
    SECRET_KEY: str = Field(default="dev-secret-change-me")  # cambiá en prod
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60 * 24)  # 24h

    # --- DB ---
    DATABASE_URL: str = Field(default="sqlite:///./basedatos.db")

    # --- CORS ---
    CORS_ORIGINS: List[str] = Field(
        default=["http://127.0.0.1:5173", "http://localhost:5173"]
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
