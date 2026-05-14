import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends

from core.config import settings
from core.dependencies import get_current_user_from_token
from consumer import consume_all_topics
from reporting import router as reporting_router
from audits import router as audits_router
from database import AsyncSessionLocal
from schemas import CurrentUser

from core.logging_config import configure as configure_logging
configure_logging(service="audit-reporting-service")
logger = logging.getLogger("audit-reporting-service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Audit Reporting Service")
    # Schema is owned by infra/db/migrations/*.sql, applied via
    # infra/db/run_migrations.sh. Do not create tables from metadata here.

    task = asyncio.create_task(consume_all_topics())
    yield
    # Shutdown
    task.cancel()

async def get_db_with_rls(
    current_user: CurrentUser = Depends(get_current_user_from_token)
):
    """
    Dependency that yields a database session with the app.current_user_id 
    session variable set for PostgreSQL RLS.
    """
    from sqlalchemy import text
    async with AsyncSessionLocal() as session:
        # Set the session-level variable for RLS
        await session.execute(
            text("SELECT set_config('app.current_user_id', :user_id, true)"),
            {"user_id": str(current_user.id)}
        )
        yield session

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

app.include_router(reporting_router, prefix="/api/v1/reports")
app.include_router(audits_router, prefix="/api/v1/audits")

from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
