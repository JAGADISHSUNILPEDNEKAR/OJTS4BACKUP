import io
import logging
import boto3
import csv
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import String, desc

from core.config import settings
from core.dependencies import get_current_user_from_token, get_db_with_rls, RoleChecker, UserRole
from models import AuditLog
from schemas import CurrentUser

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

logger = logging.getLogger("audit-reporting.reporting")
router = APIRouter()

s3_client = boto3.client(
    "s3",
    region_name=settings.AWS_REGION
)

class ReportRequest(BaseModel):
    type: str # 'PDF' or 'CSV'

@router.post("/generate")
async def generate_summary_report(
    req: ReportRequest, 
    current_user: CurrentUser = Depends(RoleChecker([UserRole.AUDITOR, UserRole.GOVERNMENT, UserRole.COMPANY])),
    db: AsyncSession = Depends(get_db_with_rls)
):
    """Generates a summary report of all recent audit logs."""
    query = select(AuditLog).order_by(desc(AuditLog.recorded_at)).limit(100)
    result = await db.execute(query)
    logs = result.scalars().all()

    if req.type.upper() == "CSV":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Topic", "Recorded At", "Payload"])
        for log in logs:
            writer.writerow([str(log.id), log.topic, log.recorded_at, str(log.payload)])
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=audit_summary.csv"}
        )
    
    # Default to PDF summary
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, "Origin System - Audit Summary Report")
    c.setFont("Helvetica", 10)
    y = 720
    for log in logs[:30]:
        c.drawString(50, y, f"[{log.recorded_at}] {log.topic}: {str(log.payload)[:80]}...")
        y -= 15
        if y < 50: break
    c.save()
    pdf_buffer.seek(0)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=audit_summary.pdf"}
    )

@router.get("/shipment/{shipment_id}/proof")
async def generate_pdf_proof(
    shipment_id: str, 
    current_user: CurrentUser = Depends(RoleChecker([UserRole.AUDITOR, UserRole.GOVERNMENT, UserRole.COMPANY, UserRole.FARMER])),
    db: AsyncSession = Depends(get_db_with_rls)
):
    logger.info(f"Generating PDF proof for shipment {shipment_id}")

    query = select(AuditLog).where(
        AuditLog.payload.cast(String).like(f'%"{shipment_id}"%')
    ).order_by(AuditLog.recorded_at.asc())
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Generate PDF in memory
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=letter)
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, f"Origin System - Immutable Proof")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, 720, f"Shipment ID: {shipment_id}")
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 680, "Audit Trail")
    
    c.setFont("Helvetica", 10)
    y_position = 650
    
    for log in logs[:15]:
        line = f"[{log.recorded_at.strftime('%Y-%m-%d %H:%M:%S')}] {log.topic}"
        c.drawString(50, y_position, line)
        y_position -= 20
        payload = log.payload
        if "txid" in payload:
            c.drawString(70, y_position, f"BTC TXID: {payload['txid']}")
            y_position -= 15
        if "merkle_root" in payload:
            c.drawString(70, y_position, f"Merkle Root: {payload['merkle_root']}")
            y_position -= 15
        
        y_position -= 5
        if y_position < 100:
            c.drawString(50, y_position, "... (truncated)")
            break

    c.save()
    pdf_buffer.seek(0)
    
    # For production, we still return the buffer directly if S3 fails or is not preferred for direct proof downloads
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=proof_{shipment_id}.pdf"}
    )
