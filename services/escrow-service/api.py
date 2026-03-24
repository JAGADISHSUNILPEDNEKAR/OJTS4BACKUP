from fastapi import APIRouter
import logging
from escrow import process_fund_hold

router = APIRouter()
logger = logging.getLogger("escrow-service.api")

@router.post("/dispute")
async def flag_dispute(shipment_id: str):
    logger.info(f"Flagging dispute for shipment {shipment_id}")
    # Updates DB
    return {"status": "DISPUTED", "shipment_id": shipment_id}

@router.post("/psbt/trigger")
async def trigger_psbt_flow(shipment_id: str):
    return await process_fund_hold(shipment_id)

