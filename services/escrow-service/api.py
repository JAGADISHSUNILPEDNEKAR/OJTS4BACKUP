from fastapi import APIRouter, HTTPException, Depends
import logging
from sqlalchemy.future import select
from pydantic import BaseModel
from escrow import process_fund_hold, PSBTTriggerRequest, THRESHOLD, finalize_escrow
from database import AsyncSessionLocal
from models import EscrowState
from core.dependencies import RoleChecker, UserRole
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
    current_user: CurrentUser = Depends(RoleChecker([UserRole.FARMER, UserRole.COMPANY, UserRole.AUDITOR]))
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

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(EscrowState).where(EscrowState.shipment_id == shipment_id)
        )
        escrow = result.scalar_one_or_none()

        if escrow is None:
            raise HTTPException(
                status_code=404,
                detail="Shipment PSBT not found or not initialized.",
            )

        if escrow.status == "finalized":
            return {"status": "ALREADY_FINALIZED", "shipment_id": shipment_id}

        signers = list(escrow.signers or [])
        if request.participant_id not in signers:
            signers.append(request.participant_id)
            escrow.signers = signers

        current_count = len(signers)
        logger.info(
            f"Registered signature for {shipment_id} from {request.participant_id}. "
            f"Total: {current_count}/{THRESHOLD}"
        )

        if current_count >= THRESHOLD:
            escrow.status = "finalized"
            await session.commit()
            await finalize_escrow(shipment_id)
            return {
                "status": "FINALIZED",
                "shipment_id": shipment_id,
                "message": "Threshold reached. Broadcasting transaction.",
            }

        await session.commit()
        return {"status": "SIGNED", "shipment_id": shipment_id, "signatures_count": current_count}
