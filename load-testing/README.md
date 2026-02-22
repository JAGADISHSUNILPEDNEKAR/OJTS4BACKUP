# Origin Load Testing

This directory contains the load testing scripts used for **Phase 7: Production Hardening**.

## Setup

Create a virtual environment and install the dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Running the IoT Ingestion Load Test

Ensure the system is running via docker-compose (specifically `iot-ingestion-service` and its dependencies like TimescaleDB and Kafka).
If hitting the IoT service directly (port: 8004):
```bash
locust -f locustfile.py --host=http://localhost:8004
```

To run a headless automated test that scales to 1,000 users at 100 users/sec:
```bash
locust -f locustfile.py --host=http://localhost:8004 --headless -u 1000 -r 100 --run-time 1m
```
