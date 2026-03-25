import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.dependencies import get_current_user_from_token
from consumer import consume_all_topics
from reporting import router as reporting_router
from audits import router as audits_router
from database import engine, AsyncSessionLocal, Base
from schemas import CurrentUser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("audit-reporting")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Audit Reporting Service")
    # We could await database tables creation here, but let's assume migrations apply them
    # For the stub, we could also just call Base.metadata.create_all(bind=engine)
    from database import engine, Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
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

@app.get("/health")
async def health_check():
    return {"status": "ok"}
