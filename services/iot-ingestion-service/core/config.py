import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Origin IoT Ingestion Service"
    API_V1_STR: str = "/api/v1"

    # Needs to match Auth Service
    SECRET_KEY: str = "super-secret-key-that-should-be-in-vault-and-very-long"
    ALGORITHM: str = "HS256"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/origin"
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"

    # Vault Integration
    VAULT_ADDR: str = "http://vault:8200"
    VAULT_TOKEN: str = "root"  # Default for dev/test

    # Refuse to fall back to the literal "mock-device-secret" HMAC value
    # when Vault is unreachable / disabled. Defaults to true so a
    # production deploy that loses Vault stops accepting telemetry rather
    # than authenticating every device with the same public string.
    # Local dev / docker-compose / pytest must explicitly opt out by
    # setting REQUIRE_VAULT_DEVICE_SECRETS=false in env.
    REQUIRE_VAULT_DEVICE_SECRETS: bool = os.getenv("REQUIRE_VAULT_DEVICE_SECRETS", "true").lower() == "true"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
