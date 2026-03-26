from sqlalchemy import Column, String, Integer, JSON, DateTime, func
from database import Base

class EscrowState(Base):
    __tablename__ = "escrow_states"

    shipment_id = Column(String, primary_key=True, index=True)
    status = Column(String, default="pending_signatures")
    signers = Column(JSON, default=list) # List of signer IDs
    amount_usd = Column(Integer)
    amount_btc = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
