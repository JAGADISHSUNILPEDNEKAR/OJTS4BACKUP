from sqlalchemy import Column, Integer, Float, String, Boolean
from core.database import Base

class AlertThreshold(Base):
    __tablename__ = "alert_thresholds"

    id = Column(Integer, primary_key=True, index=True)
    severity = Column(String, unique=True, index=True)
    threshold_value = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
