from typing import Literal, Optional
import json
import secrets

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    MODE: Literal["local"] = "local"
    DATABASE_URL: str = "sqlite:///./a3_local.db"
    STORAGE_PATH: str = "./data/uploads"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"

    JWT_SECRET: Optional[str] = Field(default=None)
    JWT_EXPIRE_MINUTES: int = Field(default=60, ge=5, le=1440)
    LOCAL_LICENSE_KEY: Optional[str] = Field(default=None)
    REQUIRE_LICENSE_KEY: bool = Field(default=False)
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None)
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None)
    GOOGLE_REDIRECT_URI: Optional[str] = Field(default=None)
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
        if not self.JWT_SECRET:
            self.JWT_SECRET = secrets.token_urlsafe(48)
        elif len(self.JWT_SECRET) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters.")
        return self


settings = Settings()
