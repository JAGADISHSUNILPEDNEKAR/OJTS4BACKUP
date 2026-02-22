import logging
from sqlalchemy import text
from typing import Dict, Any
from core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

async def extract_features(shipment_id: str) -> Dict[str, Any]:
    logger.info(f"Extracting features for {shipment_id}")
    async with AsyncSessionLocal() as session:
        # We query the sensor_readings hypertable for the latest 60 readings
        result = await session.execute(
            text("SELECT temperature, humidity FROM sensor_readings WHERE shipment_id = :sid ORDER BY timestamp DESC LIMIT 60"),
            {"sid": shipment_id}
        )
        rows = result.fetchall()
        
    if not rows:
        return {"mean_temp": 0.0, "mean_humidity": 0.0, "readings_count": 0}
        
    mean_temp = sum(r[0] for r in rows) / len(rows)
    mean_humidity = sum(r[1] for r in rows) / len(rows)
    return {"mean_temp": mean_temp, "mean_humidity": mean_humidity, "readings_count": len(rows)}
