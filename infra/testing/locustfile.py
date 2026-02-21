from locust import HttpUser, task, between
import random
import uuid

class OriginDeviceUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def send_telemetry(self):
        payload = {
            "readings": [
                {
                    "time": "2026-02-21T12:00:00Z",
                    "device_id": str(uuid.uuid4()),
                    "shipment_id": str(uuid.uuid4()),
                    "temperature": random.uniform(-5.0, 15.0),
                    "humidity": random.uniform(30.0, 90.0),
                    "tamper_flag": False
                }
            ]
        }
        headers = {
            "X-Device-Signature": "dummy-signature"
        }
        self.client.post("/api/v1/iot/ingest", json=payload, headers=headers)
