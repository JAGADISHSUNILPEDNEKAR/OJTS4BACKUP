import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Origin Alert Service"
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
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "origin_user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "origin_pass")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "origin")
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "SG.mock")

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()
