import secrets
from typing import Literal, Optional

from pydantic import Field, model_validator
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

    # Local mode gets an ephemeral secret; cloud mode must provide one explicitly.
    JWT_SECRET: Optional[str] = Field(default=None)
    JWT_EXPIRE_MINUTES: int = Field(default=60, ge=5, le=1440)

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_security(self):
        if self.MODE == "cloud":
            if not self.JWT_SECRET or len(self.JWT_SECRET) < 32:
                raise ValueError(
                    "JWT_SECRET must be explicitly configured with at least 32 characters in cloud mode."
                )
        elif not self.JWT_SECRET:
            self.JWT_SECRET = secrets.token_urlsafe(48)
        elif len(self.JWT_SECRET) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters.")
        return self


settings = Settings()
