from fastapi import APIRouter, HTTPException, Depends
import logging
from pydantic import BaseModel
from escrow import process_fund_hold, PSBTTriggerRequest, SIGNATURE_STORE, THRESHOLD, finalize_escrow
from core.dependencies import get_current_user_from_token, RoleChecker, UserRole
from schemas import CurrentUser

router = APIRouter()
logger = logging.getLogger("escrow-service.api")

class PSBTSignRequest(BaseModel):
    shipment_id: str
    participant_id: str
    signature_hash: str

@router.post("/dispute")
async def flag_dispute(
    shipment_id: str,
    current_user: CurrentUser = Depends(RoleChecker([UserRole.FARMER, UserRole.COMPANY, UserRole.GOVERNMENT]))
):
    logger.info(f"Flagging dispute for shipment {shipment_id}")
    # Updates DB
    return {"status": "DISPUTED", "shipment_id": shipment_id}

@router.post("/psbt/trigger")
async def trigger_psbt_flow(
    request: PSBTTriggerRequest,
    current_user: CurrentUser = Depends(RoleChecker([UserRole.COMPANY, UserRole.FARMER]))
):
    return await process_fund_hold(request)

@router.post("/psbt/sign")
async def sign_psbt(
    request: PSBTSignRequest,
    current_user: CurrentUser = Depends(RoleChecker([UserRole.COMPANY, UserRole.FARMER]))
):
    if request.participant_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot sign for another participant")
        
    shipment_id = request.shipment_id
    
    if shipment_id not in SIGNATURE_STORE:
        raise HTTPException(status_code=404, detail="Shipment PSBT not found or not initialized in local store.")
        
    store = SIGNATURE_STORE[shipment_id]
    
    if store["status"] == "finalized":
        return {"status": "ALREADY_FINALIZED", "shipment_id": shipment_id}
        
    store["signers"].add(request.participant_id)
    current_count = len(store["signers"])
    logger.info(f"Registered signature for {shipment_id} from {request.participant_id}. Total: {current_count}/{THRESHOLD}")
    
    if current_count >= THRESHOLD:
        store["status"] = "finalized"
        await finalize_escrow(shipment_id)
        return {"status": "FINALIZED", "shipment_id": shipment_id, "message": "Threshold reached. Broadcasting transaction."}
        
    return {"status": "SIGNED", "shipment_id": shipment_id, "signatures_count": current_count}
