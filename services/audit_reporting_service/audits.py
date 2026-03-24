from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from database import get_db
from models import AuditLog

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def fetch_audits(db: AsyncSession = Depends(get_db)):
    """Returns a list of audits dynamically queried from audit_logs."""
    # We query important event topics to show in the high-level audit list
    topics = ["bitcoin.anchored", "merkle.committed", "alert.created", "audit.request.created"]
    query = select(AuditLog).where(AuditLog.topic.in_(topics)).order_by(desc(AuditLog.recorded_at)).limit(50)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    audits = []
    for log in logs:
        # Map log topics to UI structures
        findings = 0
        status = "Passed"
        
        if log.topic == "alert.created":
            status = "Warning" if log.payload.get("severity") != "CRITICAL" else "Failed"
            findings = 1
            
        audits.append({
            "id": f"AUD-{str(log.id)[:8]}",
            "entity": log.payload.get("shipment_id", "N/A"),
            "type": log.topic.replace(".", " ").title(),
            "auditor": "Origin Engine",
            "status": status,
            "timestamp": log.recorded_at.isoformat(),
            "findings": findings
        })
        
    return audits

from pydantic import BaseModel
class AuditRequest(BaseModel):
    shipment_id: str

@router.post("/")
async def request_audit(req: AuditRequest, db: AsyncSession = Depends(get_db)):
    """Logs a real request for a new audit in the audit_logs table."""
    audit_log = AuditLog(
        topic="audit.request.created",
        payload={"shipment_id": req.shipment_id, "requester": "UI-User"}
    )
    db.add(audit_log)
    await db.commit()
    
    return {
        "status": "AUDIT_REQUESTED", 
        "shipmentId": req.shipment_id, 
        "auditId": f"AUD-{str(audit_log.id)[:8]}"
    }
