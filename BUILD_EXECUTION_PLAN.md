# Origin – Master Build Execution Plan

**Prepared for:** Core Engineering Team
**Project:** Origin (Agricultural Supply Chain Fraud Detection System)
**Document Type:** Step-by-Step Production Build Execution and Sequencing Plan
**Goal:** Build the Origin platform from scratch with correct engineering sequencing, managing dependencies, parallel work streams, and systematic risk mitigation.

---

## Executive Summary of Engineering Strategy

Origin is a complex, distributed, event-driven microservices platform involving FastAPI, Rust, PyTorch ML models, Kafka, TimescaleDB, and Bitcoin. To build this successfully, the team must avoid "big bang" integration. The build order is strictly sequenced by **data dependencies**:
1. Static Infrastructure & Data Stores
2. Identity & Edge Security
3. Core Producers (Shipment & IoT Data)
4. Core Consumers (ML & Event Processing)
5. Advanced/Crypto Mechanisms (Bitcoin, Escrow)
6. Consumers & Dashboards

---

## Phase 1: Foundation & Infrastructure Provisioning
**Goal:** Provision all underlying cloud resources and define the Infrastructure-as-Code (IaC) baseline so application code has a place to run.

### 1.1 Infrastructure-as-Code (Terraform)
- **Action:** Define the network topology (VPC, Public/DMZ/Private Subnets, NAT Gateways).
- **Action:** Provision managed databases: PostgreSQL (RDS, 1 primary, 2 replicas), Redis (ElastiCache Cluster), and TimescaleDB (M5 instance).
- **Action:** Provision event layer: Apache Kafka (AWS MSK / Redpanda) with 3 brokers and SASL_SSL.
- **Action:** Provision storage: Auto-scaling S3 buckets (`origin-manifests`, `origin-kyc`, `origin-models`, `origin-proofs`) with SSE-S3/KMS and VPC endpoints.
- **Why here?** Blockers for all subsequent backend development. No services can start without DB connections and Kafka brokers.

### 1.2 Base Cluster & SecOps Setup
- **Action:** Spin up Kubernetes Cluster (EKS/GKE) with basic node pools.
- **Action:** Deploy HashiCorp Vault for secrets management (Bitcoin keys, JWT keys, DB passwords).
- **Action:** Deploy central observability stack: Prometheus, Grafana, ELK/FluentBit.
- **Why here?** Services need Vault to boot securely. Developers need logs to debug Phase 2.

### Phase 1 Deliverables & Risks
- **Deliverable:** Fully functional Staging environment ready for code deployments.
- **Risk:** Unoptimized TimescaleDB or Kafka configs leading to early bottlenecks.

---

## Phase 2: Edge Security & Identity Core
**Goal:** Establish the API Gateway, secure routing, and user management so other services don't have to build auth logic.

### 2.1 API Gateway & Edge
- **Action:** Deploy Nginx/Traefik Ingress controller.
- **Action:** Configure TLS termination, mTLS for internal routing, and WAF rules.
- **Why here?** All client traffic and internal service-to-service calls will route through this.

### 2.2 Auth Service (FastAPI) & User Service (FastAPI)
- **Action:** Execute DB Migrations `001` (Orgs), `002` (Users), `003` (Sessions/KYC).
- **Action:** Implement `AuthService`: Login, JWT RS256 generation (keys from Vault), SSO, TOTP, account lockout (Redis).
- **Action:** Implement `UserService`: Profile management, RBAC enforcement.
- **Action:** Implement `kyc.submitted` Kafka event publishing.
- **Why here?** Every other service's endpoints require a valid JWT with role claims.

### Phase 2 Deliverables & Risks
- **Deliverable:** Authentication gateway protecting a dummy endpoint.
- **Risk:** Poor JWT rotation logic or secret injection failures from Vault.

---

## Phase 3: Core Producers (Data Ingestion)
**Goal:** Build the mechanisms to accept the primary data sets: Shipments (manual) and Sensor Telemetry (automated/IoT).

### 3.1 Shipment Service — Part 1 (Data Model & REST CRUD)
- **Action:** Execute Migrations `005` (Shipments), `006`, `007`, `008`.
- **Action:** Implement `POST /api/v1/shipments` (with dummy ML pre-check for now). Implements S3 manifest upload via `boto3`.
- **Action:** Implement `POST /api/v1/shipments/{id}/custody` with ECDSA signature validation for handoffs.
- **Action:** Implement Kafka publishers for `shipment.created` and `custody.handoff`.
- **Why here?** Shipments are the central entities in the system. IoT, ML, and Crypto all bind to a Shipment ID.

### 3.2 IoT Ingestion Service (FastAPI)
- **Action:** Implement `POST /api/v1/iot/ingest`. Validate HMAC device signatures.
- **Action:** Bulk insert telemetry into TimescaleDB `sensor_readings` hypertable using `asyncpg`.
- **Action:** Publish `sensor.ingested` Kafka events.
- **Why here?** ML models need real sensor data to run inference.

### Phase 3 Deliverables & Risks
- **Deliverable:** Clients can create shipments and devices can stream telemetry.
- **Risk:** TimescaleDB write locks under high concurrent device load. Optimize batching early.

---

## Phase 4: Machine Learning & Event Processing
**Goal:** Consume the data produced in Phase 3 to generate insights, anomaly detections, and asynchronous alerts.

### 4.1 ML Service (FastAPI / PyTorch)
- **Action:** Deploy `origin-models` bucket with baseline artifacts (`.pt`, `.pkl`).
- **Action:** Implement `FeatureExtractor` to query TimescaleDB (60-reading windows).
- **Action:** Implement Kafka consumer for `shipment.created`, `sensor.ingested`, `custody.handoff`.
- **Action:** Wire up Isolation Forest (Spoilage), LSTM (Time-series anomalies), GNN (Route analysis), and Ensemble models.
- **Action:** Publish `ml.inference.completed` to Kafka.
- **Why here?** The models require the DB structures and Kafka events established in Phase 3.

### 4.2 Alert Service (FastAPI)
- **Action:** Implement `MLResultConsumer` to consume `ml.inference.completed`.
- **Action:** Implement Threshold Evaluator (compare scores against `alert_thresholds` table).
- **Action:** Dispatch emails via SendGrid and push notifications. Publish `alert.created`.
- **Why here?** Depends strictly on the output topology of the ML Service.

### Phase 4 Deliverables & Risks
- **Deliverable:** System automatically flags spoofed telemetry and bad routes.
- **Risk:** Kafka consumer lag in ML Service. Must implement KEDA profiling for autoscaling early.

---

## Phase 5: Cryptography, Bitcoin Anchoring, and Escrow
**Goal:** Implement the "Trust-Minimized" cryptographic features that make Origin unique.

*(Note: This phase can run in parallel with Phase 4 if separate Rust/Bitcoin talent is available)*

### 5.1 Crypto Service (Rust) — Merkle Module & Bitcoin Anchoring
- **Action:** Deploy Bitcoin Core Node on isolated VM (Testnet first).
- **Action:** Implement pure Rust Merkle Tree builder. Schedule Tokio job to run every 10 minutes on uncommitted `merkle_leaves`.
- **Action:** Construct, sign, and broadcast `OP_RETURN` transactions via Bitcoin RPC.
- **Action:** Publish `merkle.committed` and `bitcoin.anchored` to Kafka.

### 5.2 Escrow Engine & PSBTs
- **Action:** Implement Escrow Service (FastAPI). Consume `alert.created` to flag disputes.
- **Action:** Implement PSBT flow in Crypto Service (Rust): Build 2-of-3 multisig, collect base64 partial signatures from buyers and sellers, finalize, and broadcast release/funding transaction.
- **Why here?** Crypto Service relies on Shipments and Custody events existing. Escrow relies on Alerts existing to know whether to hold funds.

### Phase 5 Deliverables & Risks
- **Deliverable:** Cryptographically verifiable supply chain with on-chain testnet proofs and multisig smart contracts.
- **Risk:** Bitcoin transaction mempool congestion breaking the anchoring SLAs. Must implement dynamic fee bumping (RBF).

---

## Phase 6: Audit, Reporting, and Client Integration
**Goal:** Expose the complex backend state to human operators securely.

### 6.1 Audit Service & Reporting Service
- **Action:** Implement Audit Service (Kafka sink consuming ALL topics into append-only `audit_logs`).
- **Action:** Implement PDF Proof generator in Reporting Service. Assembles Merkle paths, BTC TXIDs, and ML scores into a single S3 artifact.
- **Why here?** Requires the entire system flow to be complete to capture valid end-to-end data.

### 6.2 Frontend App Connectivity (Next.js & Flutter)
- **Action:** Connect Web App dashboards utilizing paginated endpoints.
- **Action:** Connect Flutter mobile app to `POST /shipments/{id}/custody` to allow offline-first ECDSA signing of handoffs.

### Phase 6 Deliverables & Risks
- **Deliverable:** Fully usable platform for buyers, farmers, and auditors.

---

## Phase 7: Production Hardening & Mainnet Migration
**Goal:** Prepare for live commercial traffic.

1. **Load Testing:** Simulate 10,000 concurrent IoT devices using Locust. Profile API Gateway and TimescaleDB ingestion.
2. **Infrastructure Failover:** Test RDS and Redis failover. Test Kafka broker loss.
3. **Penetration Testing:** Audit JWT implementation, Vault configuration, and RLS policies in PostgreSQL.
4. **Mainnet Cutover:** Point Crypto Service to Mainnet Bitcoin Node, rotate production multisig keys via HSM.
5. **Go Live:** Lift the traffic gates on `app.origin.app`.

---

## Master Dependency Flow Summary

If visualized as a strictly sequenced engineering PERT chart:
`[Terraform/K8s/Vault]` → `[PostgreSQL/Kafka/Redis]` → `[Gateway/Auth Service]` → `[Shipment Service]` → `[IoT Ingestion]` → `[ML Service]` → `[Alert Service]` → `[Escrow Service]`.
*(Crypto Service runs async alongside Escrow; Audit runs as a sink across all).*
