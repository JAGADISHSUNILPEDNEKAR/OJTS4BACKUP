from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Origin User Service"
    API_V1_STR: str = "/api/v1"
    
    # Needs to match Auth Service
    SECRET_KEY: str = "super-secret-key-that-should-be-in-vault-and-very-long"
    ALGORITHM: str = "HS256"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/origin"
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
