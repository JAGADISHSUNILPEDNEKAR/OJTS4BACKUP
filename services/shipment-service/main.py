from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
import json
import boto3
import uuid
from ecdsa import VerifyingKey, NIST256p, BadSignatureError
# from kafka import KafkaProducer

app = FastAPI(title="Origin Shipment Service")

# S3 and Kafka clients mocked
# s3_client = boto3.client('s3')
# producer = KafkaProducer(bootstrap_servers=['kafka:9092'],
#                          value_serializer=lambda v: json.dumps(v).encode('utf-8'))

class ShipmentCreate(BaseModel):
    farmer_id: str
    destination: str
    # other metadata...

class CustodyHandoff(BaseModel):
    custodian_id: str
    ecdsa_signature: str # hex string
    public_key: str # hex string

@app.post("/api/v1/shipments")
async def create_shipment(farmer_id: str = Form(...), destination: str = Form(...), manifest: UploadFile = File(...)):
    # 1. Dummy ML pre-check
    # if ml_check(manifest) fails: raise Exception
    
    shipment_id = str(uuid.uuid4())
    s3_key = f"manifests/{shipment_id}/{manifest.filename}"
    
    # 2. Upload manifest to S3
    # s3_client.upload_fileobj(manifest.file, "origin-manifests", s3_key)
    
    # 3. Save to DB (mocked)
    
    # 4. Publish Kafka event
    event = {
        "event": "shipment.created",
        "shipment_id": shipment_id,
        "farmer_id": farmer_id,
        "s3_key": s3_key
    }
    # producer.send('shipment-events', event)
    
    return {"shipment_id": shipment_id, "status": "CREATED"}

@app.post("/api/v1/shipments/{shipment_id}/custody")
async def custody_handoff(shipment_id: str, handoff: CustodyHandoff):
    # 1. ECDSA Signature Validation
    message = f"{shipment_id}:{handoff.custodian_id}".encode('utf-8')
    try:
        vk = VerifyingKey.from_string(bytes.fromhex(handoff.public_key), curve=NIST256p)
        vk.verify(bytes.fromhex(handoff.ecdsa_signature), message)
    except (BadSignatureError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid ECDSA signature")
        
    # 2. Save custody event to DB (mocked)
    
    # 3. Publish to Kafka
    event = {
        "event": "custody.handoff",
        "shipment_id": shipment_id,
        "custodian_id": handoff.custodian_id
    }
    # producer.send('shipment-events', event)
    
    return {"status": "HANDOFF_VERIFIED", "shipment_id": shipment_id}
