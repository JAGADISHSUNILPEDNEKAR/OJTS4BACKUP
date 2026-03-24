from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime

router = APIRouter()

MOCK_AUDITS = [
    { "id": "AUD-1021", "entity": "STR-8812", "type": "Route Compliance", "auditor": "ComplianceBot v2", "status": "Passed", "timestamp": "2024-10-24T14:30:00Z", "findings": 0 },
    { "id": "AUD-1020", "entity": "ESC-8839", "type": "Financial Reconciliation", "auditor": "Alex Rivera", "status": "Failed", "timestamp": "2024-10-24T12:15:00Z", "findings": 3 },
    { "id": "AUD-1019", "entity": "STR-8810", "type": "Sensor Calibration", "auditor": "IoT Validator", "status": "Passed", "timestamp": "2024-10-23T18:00:00Z", "findings": 0 },
    { "id": "AUD-1018", "entity": "STR-7721", "type": "Cold Chain Integrity", "auditor": "Sarah Chen", "status": "Warning", "timestamp": "2024-10-23T09:30:00Z", "findings": 1 },
    { "id": "AUD-1017", "entity": "ESC-8840", "type": "Settlement Verification", "auditor": "FinOps Bot", "status": "Passed", "timestamp": "2024-10-22T16:45:00Z", "findings": 0 },
    { "id": "AUD-1016", "entity": "STR-6650", "type": "Geofence Compliance", "auditor": "ComplianceBot v2", "status": "Failed", "timestamp": "2024-10-22T11:20:00Z", "findings": 2 },
]

@router.get("/", response_model=List[Dict[str, Any]])
async def fetch_audits():
    """Returns a list of audits for the dashboard."""
    return MOCK_AUDITS

from pydantic import BaseModel
class AuditRequest(BaseModel):
    shipment_id: str

@router.post("/")
async def request_audit(req: AuditRequest):
    """Logs a request for a new audit."""
    new_id = f"AUD-{1022 + len(MOCK_AUDITS) - 6}"
    # In a real system, this would push a request to Kafka or store in DB
    return {"status": "AUDIT_REQUESTED", "shipmentId": req.shipment_id, "auditId": new_id}
