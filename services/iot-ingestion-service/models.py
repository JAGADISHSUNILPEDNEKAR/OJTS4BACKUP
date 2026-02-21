import uuid
from sqlalchemy import Column, String, Float, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    
    time = Column(DateTime(timezone=True), primary_key=True)
    device_id = Column(String(255), primary_key=True)
    shipment_id = Column(UUID(as_uuid=True), nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    tamper_flag = Column(Boolean, default=False)
