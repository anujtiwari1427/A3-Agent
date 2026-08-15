from pydantic_settings import BaseSettings
from typing import Literal, Optional

class Settings(BaseSettings):
    MODE: Literal["local", "cloud"] = "local"
    
    # Local Mode settings
    DATABASE_URL: str = "sqlite:///./a3_local.db"
    STORAGE_PATH: str = "./data/uploads"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    
    # Cloud Mode settings
    CLOUD_DATABASE_URL: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    
    # Auth
    JWT_SECRET: str = "supersecret-dev-key-change-in-prod"
    JWT_EXPIRE_MINUTES: int = 10080 # 7 days default
    
    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env.local"

settings = Settings()
