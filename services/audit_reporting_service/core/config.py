import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Origin Audit & Reporting Service"
    API_V1_STR: str = "/api/v1"
    
    # Needs to match Auth Service
    PUBLIC_KEY: str = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn7O6m5/qYN7LUZ9pZvP0
gpkDze0Y34cay9edn6tQ4ym3unFTdGF8zaOhsxFyS1QQzWu50OB1V4RtYA7Pzl9i
98TvVv8zoiKMQqKpg7eRr83YNLGFqx0744I0UZprSpbzu0PBIPL+nFCYyH87KtaR
h3V3hIeC0oohICyY1h8iCkRUePrjH3xup9wwPck/16ShyieezTSH09nP6GQ3ml1d
AiNxf6fWfdPYney9V9mXFx5jWhdAnDuBhwlhRo0hnlDEFHmiYdP6M+98zC2runr+
PVL/5fTaKmP0h8FZLCYijxNg6V2qQL8A6qP39yyjlNNAJNuCvjMOUI5+aqvpxFBy
vwIDAQAB
-----END PUBLIC KEY-----"""
    ALGORITHM: str = "RS256"

    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/origin")
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "origin-proofs")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
