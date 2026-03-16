from fastapi import APIRouter
import logging

router = APIRouter()
logger = logging.getLogger("escrow-service.api")

@router.post("/dispute")
async def flag_dispute(shipment_id: str):
    logger.info(f"Flagging dispute for shipment {shipment_id}")
    # Updates DB
    return {"status": "DISPUTED", "shipment_id": shipment_id}

@router.post("/psbt/trigger")
async def trigger_psbt_flow(shipment_id: str):
    logger.info(f"Triggering PSBT flow via Crypto Service for shipment {shipment_id}")
    # In a real app, this would call Crypto Service's gRPC/REST APIs
    # Here we simulate the mocked cryptographic payload from the JSON
    return {
        "status": "PSBT_FLOW_INITIATED",
        "shipment_id": shipment_id,
        "escrow": {
            "escrow_id": f"ESC-MOCK-{shipment_id[-8:].upper() if len(shipment_id) >= 8 else shipment_id}",
            "escrow_psbt_id": "MOCK-PSBT-cHNidP8BAHQCAAAAASaBcTce3/KF6Tet7qSze3gADAAAAAD/////",
            "escrow_state": "pending",
            "escrow_amount_usd": 18500.00,
            "escrow_amount_btc": 0.2073,
            "multisig_participants": [
                {
                    "participant_id": "BUYER-ABUDHABI-012",
                    "role": "buyer",
                    "signed": False,
                    "mock_public_key": "02c9b2d7e3f1a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9",
                    "signed_at": None
                },
                {
                    "participant_id": "COOP-KONKAN-MANGO-003",
                    "role": "seller",
                    "signed": True,
                    "mock_public_key": "03a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
                    "signed_at": "2025-03-14T10:15:00Z"
                }
            ],
            "required_signatures": 2,
            "total_signatories": 3
        }
    }
