from pydantic import BaseModel
from typing import List
from datetime import datetime
from uuid import UUID

class TelemetryReading(BaseModel):
    time: datetime
    device_id: str
    shipment_id: UUID
    temperature: float
    humidity: float
    tamper_flag: bool

class BulkTelemetryUpload(BaseModel):
    readings: List[TelemetryReading]
