from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Origin Auth Service"
    API_V1_STR: str = "/api/v1"
    
    # Needs to be generated and stored securely in Vault for Production
    SECRET_KEY: str = "super-secret-key-that-should-be-in-vault-and-very-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/origin"
    REDIS_URL: str = "redis://localhost:6379"

    # Account lockout
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
