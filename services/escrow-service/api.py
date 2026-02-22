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
    return {"status": "PSBT_FLOW_INITIATED", "shipment_id": shipment_id}
