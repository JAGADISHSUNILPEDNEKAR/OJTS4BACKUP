from kafka_producer import publish_message
from pydantic import BaseModel
from sqlalchemy.future import select
from models import EscrowState
from database import AsyncSessionLocal

logger = logging.getLogger("escrow-service.core")

THRESHOLD = 2

class PSBTTriggerRequest(BaseModel):
    shipment_id: str
    amount_usd: float
    amount_btc: float
    buyer_id: str
    seller_id: str
    buyer_pubkey: str
    seller_pubkey: str
    required_signatures: int = 2

async def process_fund_hold(data: PSBTTriggerRequest) -> dict:
    logger.info(f"Triggering PSBT flow via Crypto Service for shipment {data.shipment_id}")
    
    async with AsyncSessionLocal() as session:
        # Check if already exists
        stmt = select(EscrowState).where(EscrowState.shipment_id == data.shipment_id)
        result = await session.execute(stmt)
        escrow = result.scalar_one_or_none()
        
        if not escrow:
            escrow = EscrowState(
                shipment_id=data.shipment_id,
                status="pending_signatures",
                signers=[],
                amount_usd=int(data.amount_usd),
                amount_btc=int(data.amount_btc * 100_000_000) # Store as sats
            )
            session.add(escrow)
            await session.commit()
    
    # Generate the request payload dynamically
    request_payload = {
        "shipment_id": data.shipment_id,
        "amount_usd": data.amount_usd,
        "amount_btc": data.amount_btc,
        "participants": [
            {
                "participant_id": data.buyer_id,
                "role": "buyer",
                "public_key": data.buyer_pubkey
            },
            {
                "participant_id": data.seller_id,
                "role": "seller",
                "public_key": data.seller_pubkey
            }
        ],
        "required_signatures": data.required_signatures
    }
    
    # Publish to crypto-service via Kafka
    await publish_message("escrow.psbt.request", data.shipment_id, request_payload)
    
    return {
        "status": "PSBT_FLOW_INITIATED",
        "shipment_id": data.shipment_id,
        "escrow_state": "pending_crypto"
    }

async def finalize_escrow(shipment_id: str):
    logger.info(f"Threshold reached! Publishing escrow.psbt.finalize for shipment {shipment_id}")
    
    async with AsyncSessionLocal() as session:
        stmt = select(EscrowState).where(EscrowState.shipment_id == shipment_id)
        result = await session.execute(stmt)
        escrow = result.scalar_one_or_none()
        
        if escrow:
            escrow.status = "finalized"
            await session.commit()
            
    await publish_message("escrow.psbt.finalize", shipment_id, {"shipment_id": shipment_id})
