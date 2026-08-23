from typing import Literal, Optional
import json
import secrets

from pydantic import Field, field_validator, model_validator
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

    JWT_SECRET: Optional[str] = Field(default=None)
    JWT_EXPIRE_MINUTES: int = Field(default=60, ge=5, le=1440)
    LOCAL_LICENSE_KEY: str = "7710916655"
    LOCAL_ADMIN_EMAIL: str = "admin@localhost"
    LOCAL_ADMIN_PASSWORD: Optional[str] = None
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, value):
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("["):
                return json.loads(value)
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def validate_security(self):
        if self.MODE == "cloud":
            if not self.JWT_SECRET or len(self.JWT_SECRET) < 32:
                raise ValueError("JWT_SECRET must be explicitly configured with at least 32 characters in cloud mode.")
            if not self.CLOUD_DATABASE_URL:
                raise ValueError("CLOUD_DATABASE_URL is required in cloud mode.")
            if "*" in self.ALLOWED_ORIGINS:
                raise ValueError("Wildcard CORS origins are not allowed in cloud mode.")
        elif not self.JWT_SECRET:
            self.JWT_SECRET = secrets.token_urlsafe(48)
        elif len(self.JWT_SECRET) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters.")
        return self


settings = Settings()
