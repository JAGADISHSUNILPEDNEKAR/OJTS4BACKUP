import logging
from kafka_producer import publish_message

logger = logging.getLogger("escrow-service.core")

async def process_fund_hold(shipment_id: str) -> dict:
    logger.info(f"Triggering PSBT flow via Crypto Service for shipment {shipment_id}")
    
    # Generate the request payload
    request_payload = {
        "shipment_id": shipment_id,
        "amount_usd": 18500.00,
        "amount_btc": 0.2073,
        "participants": [
            {
                "participant_id": "BUYER-ABUDHABI-012",
                "role": "buyer",
                "public_key": "02c9b2d7e3f1a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9"
            },
            {
                "participant_id": "COOP-KONKAN-MANGO-003",
                "role": "seller",
                "public_key": "03a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
            }
        ],
        "required_signatures": 2
    }
    
    # Publish to crypto-service via Kafka
    await publish_message("escrow.psbt.request", shipment_id, request_payload)
    
    return {
        "status": "PSBT_FLOW_INITIATED",
        "shipment_id": shipment_id,
        "escrow_state": "pending_crypto"
    }
