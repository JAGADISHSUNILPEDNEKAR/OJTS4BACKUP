from locust import HttpUser, task, warlord, between
import random
import uuid

class OriginStandardUser(HttpUser):
    wait_time = between(1, 5)

    def on_start(self):
        # Initial login simulation
        self.client.post("/api/v1/auth/login", json={
            "email": "loadtest@origin.com",
            "password": "loadtestpassword"
        })

    @task(3)
    def fetch_shipments(self):
        self.client.get("/api/v1/shipments")

    @task(1)
    def create_shipment(self):
        self.client.post("/api/v1/shipments", data={
            "origin": "Kenya",
            "destination": "Netherlands",
            "farmer_id": "FARM-123",
            "contract_value": 1.5
        })

    @task(5)
    def send_telemetry(self):
        payload = {
            "readings": [
                {
                    "time": "2026-03-25T12:00:00Z",
                    "device_id": "DEV-LOAD-01",
                    "shipment_id": str(uuid.uuid4()),
                    "temperature": random.uniform(5.0, 10.0),
                    "humidity": random.uniform(40.0, 60.0),
                    "tamper_flag": False
                }
            ]
        }
        self.client.post("/api/v1/iot/ingest", json=payload, headers={"X-Device-Signature": "load-test-sig"})

    @task(2)
    def check_alerts(self):
        self.client.get("/api/v1/alerts")
