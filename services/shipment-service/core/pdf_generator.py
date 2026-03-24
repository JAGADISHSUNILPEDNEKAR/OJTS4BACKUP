from fpdf import FPDF
from models import Shipment, CustodyEvent

def generate_shipment_proof(shipment: Shipment, events: list[CustodyEvent]) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    
    # Title
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, "Origin Shipment Cryptographic Proof", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(10)
    
    # Shipment Details
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "Shipment Details", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 10)
    
    details = [
        f"Shipment ID: {shipment.id}",
        f"Farmer ID: {shipment.farmer_id}",
        f"Destination: {shipment.destination}",
        f"Status: {shipment.status}",
        f"ML Risk Score: {shipment.risk_score}" if getattr(shipment, "risk_score", None) is not None else "ML Risk Score: N/A",
        f"Created At: {shipment.created_at}"
    ]
    
    for d in details:
        pdf.cell(0, 6, d, new_x="LMARGIN", new_y="NEXT")
        
    pdf.ln(10)
    
    # Custody Events
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "Chain of Custody Events", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 9)
    
    if not events:
        pdf.cell(0, 6, "No custody events recorded.", new_x="LMARGIN", new_y="NEXT")
    else:
        for i, ev in enumerate(events, 1):
            pdf.set_font("helvetica", "B", 10)
            pdf.cell(0, 6, f"Handoff #{i}", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", "", 9)
            pdf.cell(0, 5, f"Timestamp: {ev.timestamp}", new_x="LMARGIN", new_y="NEXT")
            pdf.cell(0, 5, f"From: {ev.previous_custodian_id}", new_x="LMARGIN", new_y="NEXT")
            pdf.cell(0, 5, f"To: {ev.new_custodian_id}", new_x="LMARGIN", new_y="NEXT")
            pdf.cell(0, 5, f"Public Key: {ev.public_key[:20]}...", new_x="LMARGIN", new_y="NEXT")
            pdf.cell(0, 5, f"Signature: {ev.ecdsa_signature[:40]}...", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(3)

    return bytes(pdf.output())
