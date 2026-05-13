from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    JWT_SECRET: str = "changeme-replace-with-32-plus-chars"
    JWT_ALGORITHM: str = "HS256"
    SESSION_TTL_HOURS: int = 8
    COOKIE_NAME: str = "access_token"
    DATABASE_URL: str = "sqlite+aiosqlite:///./innovatepam.db"
    CORS_ORIGINS: str = "http://localhost:5173"
    UPLOAD_DIR: str = "./uploads"

    def upload_path(self, idea_id: str, stored_name: str) -> Path:
        return Path(self.UPLOAD_DIR) / idea_id / stored_name


settings = Settings()
