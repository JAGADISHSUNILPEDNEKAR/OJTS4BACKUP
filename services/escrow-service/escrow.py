import logging
from kafka_producer import publish_message
from pydantic import BaseModel
from typing import Set

logger = logging.getLogger("escrow-service.core")

# In-memory dictionary to track multisig threshold
SIGNATURE_STORE = {}
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
    
    SIGNATURE_STORE[data.shipment_id] = {
        "signers": set(),
        "status": "pending_signatures"
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
    await publish_message("escrow.psbt.finalize", shipment_id, {"shipment_id": shipment_id})
