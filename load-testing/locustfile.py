import json
import uuid
import hmac
import hashlib
from datetime import datetime, timezone
import random
from locust import HttpUser, task, between, events
import time

class IoTDeviceUser(HttpUser):
    # Wait time between tasks (simulate real-world telemetry delays)
    wait_time = between(1.0, 5.0) 
    
    def on_start(self):
        """Initialize device with a unique ID and a shipment ID"""
        self.device_id = f"device-{uuid.uuid4().hex[:8]}"
        self.shipment_id = str(uuid.uuid4())
        
    @task
    def send_telemetry(self):
        """Simulate sending a telemetry payload to the API"""
        payload = {
            "readings": [
                {
                    "time": datetime.now(timezone.utc).isoformat(),
                    "device_id": self.device_id,
                    "shipment_id": self.shipment_id,
                    "temperature": round(random.uniform(-5.0, 15.0), 2),
                    "humidity": round(random.uniform(30.0, 95.0), 2),
                    "tamper_flag": random.random() > 0.99  # 1% chance of tamper
                }
            ]
        }
        
        # FastAPI accesses the raw request body to verify the signature.
        # json.dumps must exactly match what the server reads.
        body = json.dumps(payload).encode('utf-8')
        
        # Calculate HMAC SHA256 signature
        secret = b"mock-device-secret"
        signature = hmac.new(secret, body, hashlib.sha256).hexdigest()
        
        headers = {
            "Content-Type": "application/json",
            "X-Device-Signature": signature
        }
        
        # The IoT ingestion service runs on port 8004 or via gateway
        self.client.post("/api/v1/iot/ingest", data=body, headers=headers, name="/api/v1/iot/ingest")
