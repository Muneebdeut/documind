from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # App
    APP_NAME: str = "DocuMind AI"
    DEBUG: bool = False
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/documind"

    # AI Models
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    
    # Choose provider: "openai", "google", or "groq"
    LLM_PROVIDER: str = "google"
    LLM_MODEL: str = "gemini-2.0-flash"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Vector DB
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
