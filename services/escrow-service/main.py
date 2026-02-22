from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
import asyncio
from api import router as escrow_router
from consumer import consume_alerts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("escrow-service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(consume_alerts())
    yield
    task.cancel()

app = FastAPI(title="Origin Escrow Service", lifespan=lifespan)
app.include_router(escrow_router, prefix="/api/v1/escrow")
