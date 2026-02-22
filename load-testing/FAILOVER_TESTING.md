# Hardening: Infrastructure Failover Testing

This document outlines the testing of infrastructure failover for the Origin project (Phase 7).

## 1. Database (RDS / TimescaleDB) Failover
**Procedure:**
- Inject simulated IoT traffic using Locust (`locustfile.py`).
- Terminate the primary PostgreSQL container or RDS instance.
- Observe the connection retry logic in `services/iot-ingestion-service/database.py` (SQLAlchemy).
- Verify no data loss in Kafka if DB is unreachable (Kafka should act as a buffer).

**Expectations:** The services should automatically reconnect to the newly promoted primary.

## 2. Redis Failover
**Procedure:**
- Generate JWTs by logging in via `auth-service`.
- Invalidate/restart the Redis container/cluster.
- Verify that rate-limiting and session validation degrade gracefully or recover instantly.

## 3. Kafka Broker Loss
**Procedure:**
- While Locust is pushing 10k messages, gracefully stop Kafka broker 1.
- Observe producer metrics. Retries should kick in. Consumers in `ml-service` should rebalance.
- Restart the broker. 

## Automated Test Execution Locally
To test this locally with Docker Compose:
```bash
# Start the stack
docker-compose up -d

# Start Locust load test in the background
cd load-testing
locust -f locustfile.py --host=http://localhost:8004 --headless -u 100 -r 20 &

# Induce failures:
docker-compose kill postgres
docker-compose kill redis
docker-compose kill kafka
```
