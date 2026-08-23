from typing import Literal, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    MODE: Literal["local", "cloud"] = "local"

    DATABASE_URL: str = "sqlite:///./a3_local.db"
    STORAGE_PATH: str = "./data/uploads"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"

    CLOUD_DATABASE_URL: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None

    # Never use a known fallback secret. Local development may explicitly opt in.
    JWT_SECRET: str = Field(default="", min_length=32)
    JWT_EXPIRE_MINUTES: int = Field(default=60, ge=5, le=1440)

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        if not value or len(value) < 32:
            raise ValueError(
                "JWT_SECRET must be set to a random secret of at least 32 characters."
            )
        return value


settings = Settings()
