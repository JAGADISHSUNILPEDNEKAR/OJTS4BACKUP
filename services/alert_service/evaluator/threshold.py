from core.database import AsyncSessionLocal
from models import AlertThreshold
from sqlalchemy.future import select

async def evaluate(score: float) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AlertThreshold)
            .where(AlertThreshold.is_active == True)
            .order_by(AlertThreshold.threshold_value.asc())
        )
        thresholds = result.scalars().all()
        
    # Find the lowest active threshold
    base_threshold = 0.8
    if thresholds:
        base_threshold = thresholds[0].threshold_value
        
    return score >= base_threshold
