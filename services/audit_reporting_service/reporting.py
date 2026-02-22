import io
import logging
import boto3
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import String

from config import settings
from database import get_db
from models import AuditLog

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

logger = logging.getLogger("audit-reporting.reporting")
router = APIRouter()

s3_client = boto3.client(
    "s3",
    region_name=settings.AWS_REGION
)

@router.get("/shipment/{shipment_id}/proof")
async def generate_pdf_proof(shipment_id: str, db: AsyncSession = Depends(get_db)):
    logger.info(f"Generating PDF proof for shipment {shipment_id}")

    # Fetch audit logs related to this shipment to build the proof
    # In a real scenario, the payload would be indexed or searchable
    # For this implementation, we query and filter in Python for simplicity
    # since payload is JSONB, we could query using JSONB operators, e.g.,
    # payload->>'shipment_id' = shipment_id
    query = select(AuditLog).where(
        AuditLog.payload.cast(String).like(f'%"{shipment_id}"%')
    ).order_by(AuditLog.recorded_at.asc())
    
    # Let's use a simpler text match for now considering various payload structures
    # A true implementation would have specific fields for indexing
    
    # Just retrieving all to show concept
    result = await db.execute(query)
    logs = result.scalars().all()
    
    if not logs:
        # We might not have logs, we'll still generate a dummy proof
        logger.warning(f"No audit logs found for shipment {shipment_id}")
    
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
    
    for log in logs[:15]: # Limit to avoid pagination logic in stub
        line = f"[{log.recorded_at.strftime('%Y-%m-%d %H:%M:%S')}] {log.topic}"
        c.drawString(50, y_position, line)
        y_position -= 20
        # If payload has btc txid or merkle root, display it
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
    
    file_name = f"{shipment_id}_proof.pdf"
    
    # Upload to S3, or mock if no credentials
    try:
        # In a real environment, this might block, so we'd run in threadpool
        s3_client.upload_fileobj(
            pdf_buffer,
            settings.S3_BUCKET_NAME,
            file_name,
            ExtraArgs={'ContentType': 'application/pdf'}
        )
        # Generate presigned URL
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.S3_BUCKET_NAME, 'Key': file_name},
            ExpiresIn=3600
        )
        return {"proof_url": url}
    except Exception as e:
        logger.warning(f"S3 upload failed (likely missing credentials): {e}")
        # Return a mock URL for local testing
        mock_url = f"https://s3.amazonaws.com/{settings.S3_BUCKET_NAME}/{file_name}"
        return {
            "proof_url": mock_url,
            "note": "Generated mock URL due to S3 upload failure (local dev)"
        }
