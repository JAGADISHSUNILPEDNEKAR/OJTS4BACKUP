import uuid
from sqlalchemy import Column, String, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base

class Shipment(Base):
    __tablename__ = "shipments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    current_custodian_id = Column(UUID(as_uuid=True), nullable=False)
    destination = Column(String(255), nullable=False)
    status = Column(String(50), default="CREATED")
    manifest_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    custody_events = relationship("CustodyEvent", back_populates="shipment", cascade="all, delete-orphan")

class CustodyEvent(Base):
    __tablename__ = "custody_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="CASCADE"))
    previous_custodian_id = Column(UUID(as_uuid=True), nullable=False)
    new_custodian_id = Column(UUID(as_uuid=True), nullable=False)
    ecdsa_signature = Column(String(255), nullable=False)
    public_key = Column(String(255), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    shipment = relationship("Shipment", back_populates="custody_events")
