import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Origin ML Service"
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "origin_user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "origin_pass")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "origin")
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "dev-secret-key")

    # Refuse to start if INTERNAL_API_KEY is still the committed dev default.
    # Set REQUIRE_INTERNAL_API_KEY=true in production so a misconfigured deploy
    # crashes loudly instead of accepting service-to-service calls with the
    # public dev secret.
    REQUIRE_INTERNAL_API_KEY: bool = os.getenv("REQUIRE_INTERNAL_API_KEY", "false").lower() == "true"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()
