import asyncio
import logging
from typing import List
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from core.kafka import start_kafka_producer, stop_kafka_producer, consume_ml_results, get_recent_alerts
from core.config import settings
from core.database import AsyncSessionLocal
from core.dependencies import RoleChecker, UserRole
from schemas import CurrentUser
from models import AlertThreshold
from sqlalchemy.future import select

from core.logging_config import configure as configure_logging
configure_logging(service="alert-service")
logger = logging.getLogger("alert-service")

app = FastAPI(title="Origin Alert Service")

from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)

class Alert(BaseModel):
    shipment_id: str
    score: float
    severity: str
    timestamp: str

consumer_task = None

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing Alert Service...")

    # Refuse to start in production with the committed dev SendGrid placeholder.
    # Without this guard a misconfigured deploy silently no-ops every alert
    # email, which is worse than failing to boot.
    if settings.REQUIRE_SENDGRID_KEY and settings.SENDGRID_API_KEY == "SG.mock":
        raise RuntimeError(
            "REQUIRE_SENDGRID_KEY=true but SENDGRID_API_KEY is the committed "
            "'SG.mock' placeholder. Set SENDGRID_API_KEY to a real SendGrid "
            "API key (or set REQUIRE_SENDGRID_KEY=false for local dev)."
        )

    # Schema is owned by infra/db/migrations/*.sql, applied via
    # infra/db/run_migrations.sh. Seed default alert thresholds below — these
    # are data, not schema, so they stay here.
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(AlertThreshold))
        existing_thresholds = result.scalars().all()
        if not existing_thresholds:
            session.add_all([
                AlertThreshold(severity="WARNING", threshold_value=0.8, is_active=True),
                AlertThreshold(severity="CRITICAL", threshold_value=0.9, is_active=True)
            ])
            await session.commit()
            
    await start_kafka_producer()
    global consumer_task
    consumer_task = asyncio.create_task(consume_ml_results())

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Alert Service...")
    global consumer_task
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
    await stop_kafka_producer()

@app.get("/api/v1/alerts", response_model=List[Alert])
async def get_alerts_api(
    current_user: CurrentUser = Depends(RoleChecker([UserRole.AUDITOR, UserRole.GOVERNMENT, UserRole.COMPANY, UserRole.FARMER]))
):
    return get_recent_alerts()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "alert-service"}
