import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

from config import settings
from consumer import consume_all_topics
from reporting import router as reporting_router

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

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

app.include_router(reporting_router, prefix="/api/v1/reports")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
