# Phase 7: Load Testing Simulation Plan

Because Docker is not available in the current local environment, the automated execution of the load testing script cannot be performed locally against a running MSK backend. Here is the analysis and the step-by-step procedure to execute the existing load test.

## Overview
- **Testing Tool:** Locust
- **Target:** API Gateway handling `iot-ingestion-service`.
- **Payload:** Simulated JSON sensor telemetry (temperature, humidity, tamper flags).

## The Script (`infra/testing/locustfile.py`)
The provided locust script successfully models an `OriginDeviceUser` pinging the `/api/v1/iot/ingest` endpoint with randomized telemetry.

## Execution Steps (For the staging environment)
Once the AWS staging environment is provisioned (via `infra/terraform`), perform the following steps to run the load test:

1. **Install Requirements:**
   ```bash
   pip install -r infra/testing/requirements.txt
   ```

2. **Run Locust (CLI Mode - Headless):**
   ```bash
   # Simulating 10,000 devices ramping up at 100 devices per second
   locust -f infra/testing/locustfile.py \
          --headless \
          -u 10000 \
          -r 100 \
          --host=https://api.staging.origin.app \
          --run-time 10m \
          --csv=load_test_results
   ```

3. **Metrics to Monitor:**
   - **PostgreSQL / TimescaleDB:** Check write IOPS and query latency. Watch the `pg_stat_activity` for locks.
   - **Kafka:** Monitor producer latency on the `iot-ingestion-service` brokers.
   - **Locust Output:** Ensure failures are under 0.1%.

## Suggested Improvements to Locust Script
- The current script uses a dummy HMAC signature (`"X-Device-Signature": "dummy-signature"`). To test the actual CPU load of signature validation on the API gateway, the script needs a python function to dynamically calculate the SHA256 HMAC for the generated JSON payload instead of a hardcoded string.
