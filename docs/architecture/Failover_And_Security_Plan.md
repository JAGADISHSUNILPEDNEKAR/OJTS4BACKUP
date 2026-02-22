# Phase 7: Infrastructure Failover & Security Audit Plan

## Part 1: Infrastructure Failover Testing Strategy
The goal of failover testing is to ensure that the Origin platform gracefully handles the loss of critical stateful infrastructure without dropping data or requiring manual intervention.

### 1. PostgreSQL (Amazon RDS) Failover
- **Objective:** Verify Multi-AZ failover and connection pooling retry logic.
- **Test Execution:**
  1. Trigger a manual failover event in the AWS RDS Console (Reboot with failover).
  2. **Expected Behavior:** Services (Auth, User, Shipment, etc.) should experience elevated latency and temporary 5xx errors for ~30-60 seconds.
  3. **Verification:** Ensure `asyncpg` and SQLAlchemy connection pools automatically reconnect. No orphaned processes should remain.

### 2. Redis (ElastiCache) Failover
- **Objective:** Verify that rate limiting, session storage, and caching degrade gracefully.
- **Test Execution:**
  1. Terminate the primary Redis node in the replica group.
  2. **Expected Behavior:** Auth service should temporarily fall back to slower DB queries or reject requests if strict locking is enabled.
  3. **Verification:** Verify that the replica promotes to primary and the application reconnects.

### 3. Apache Kafka (MSK) Broker Loss
- **Objective:** Ensure event durability (no message loss) when a broker goes down.
- **Test Execution:**
  1. Stop one of the three Kafka brokers.
  2. **Expected Behavior:** Producers (`iot-ingestion`, `shipment`) should pause briefly and re-route to the remaining in-sync replicas (ISRs). Consumers (`ml_service`, `alert_service`) should trigger a rebalance.
  3. **Verification:** Verify that Kafka topic replication factor (3) and `min.insync.replicas` (2) are respected. Check that no `sensor.ingested` events are dropped.


## Part 2: Penetration Testing & Security Audit

Before Mainnet Cutover, the following security vectors must be verified:

### 1. JWT Implementation Audit
- **Algorithm Check:** Ensure all tokens are signed with RS256 (not HS256). Verify that the `alg` header cannot be manipulated to `"none"`.
- **Validation:** Check that `exp` (expiration), `nbf` (not before), and `aud` (audience) claims are strictly validated in the API Gateway and FastAPI dependencies.

### 2. HashiCorp Vault Configuration
- **Access Control:** Ensure Kubernetes service accounts are the only entities allowed to read the production secrets path.
- **Rotation:** Verify that the Bitcoin multisig private keys and RS256 signing keys can be rotated without downtime.

### 3. PostgreSQL Row-Level Security (RLS)
- **Tenancy Isolation:** Verify that an authenticated user from `Organization A` cannot read or modify `Shipment` records belonging to `Organization B`.
- **Injection:** Run `sqlmap` against all paginated and filtered endpoints (especially the Audit Service and Reporting Service endpoints).
