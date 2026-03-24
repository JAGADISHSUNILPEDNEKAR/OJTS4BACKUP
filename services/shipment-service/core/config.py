from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Origin Shipment Service"
    API_V1_STR: str = "/api/v1"
    
    # Needs to match Auth Service
    SECRET_KEY: str = "super-secret-key-that-should-be-in-vault-and-very-long"
    ALGORITHM: str = "HS256"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/origin"
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "origin-shipment-manifests"
    ML_SERVICE_URL: str = "http://localhost:8004"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
