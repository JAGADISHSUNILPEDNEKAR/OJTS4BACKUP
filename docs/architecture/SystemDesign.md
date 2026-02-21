Here is the complete HLD + LLD document. It's very long — scroll and copy in sections as needed.

---

# ORIGIN – Agricultural Supply Chain Fraud Detection System
## Complete Engineering Design Document
### High Level Design (HLD) + Low Level Design (LLD)

**Prepared for:** Backend, Frontend, ML & Infrastructure Engineering Teams
**Author:** Jagadish Sunil Pednekar
**Version:** 1.0 | February 2026
**Classification:** Internal Engineering — Implementation Reference

---

# SECTION 1: SYSTEM OVERVIEW (HIGH LEVEL DESIGN)

---

## 1.1 System Purpose

### What the System Does

Origin is a mission-critical, cryptographically verifiable, ML-powered agricultural supply chain fraud detection and settlement platform. It ingests real-time IoT telemetry, logistical event data, and custodial handoff records from distributed supply chain participants. It processes this data through a multi-model machine learning pipeline to detect fraud, spoilage, route diversion, and data tampering. It anchors verified records cryptographically to the Bitcoin blockchain via Merkle commitments and enables trust-minimized financial settlement through PSBT-based multisignature escrow.

### Why It Exists

Agricultural supply chains suffer systemic fraud and misrepresentation including counterfeit certifications, hidden spoilage, falsified handling logs, product diversion, and unverifiable provenance records. These failures cause financial losses across the supply chain, erode consumer trust, and result in unfair compensation for farmers. Existing systems rely on centralized databases and retrospective audits that lack real-time verification, cryptographic integrity, and enforceable settlement mechanisms. Origin solves this by making every supply chain event verifiable, every fraud decision explainable, and every settlement enforceable without requiring centralized trust.

### Major System Capabilities

- Real-time ingestion of IoT sensor telemetry (temperature, humidity, GPS, tilt)
- Multi-model ML fraud detection: spoilage detection, tampering analysis, route deviation, provenance verification, and participant risk scoring
- Cryptographic Merkle commitment of verified supply chain events
- Bitcoin OP_RETURN anchoring of Merkle roots to the public blockchain (testnet and mainnet)
- PSBT 2-of-3 multisignature escrow creation, signing, and settlement
- Immutable chain-of-custody ledger with ECDSA-signed events
- Role-based dashboards for buyers, farmers, logistics operators, auditors, regulators, insurers, and end consumers
- Proof download: cryptographic audit PDF bundles with Merkle paths, Bitcoin txids, and ML summaries
- Dispute resolution workflows with auditor assignment and SLA tracking

### How ML, Crypto, Backend, Frontend, and Blockchain Interact

A shipment lifecycle in Origin operates as follows. A farmer or shipper submits a shipment via the mobile or web application. The FastAPI backend validates the submission, persists the shipment record to PostgreSQL, and publishes a `shipment.created` Kafka event. The IoT Ingestion Service continuously streams sensor readings into TimescaleDB. The ML Service consumes Kafka events and executes inference pipelines using Isolation Forest, LSTM Autoencoder, Graph Neural Networks, and ensemble classifiers. If ML inference produces an anomaly or risk score above configured thresholds, the Alert Service creates an alert record and notifies relevant users. In parallel, the Crypto Service batches verified events into a Merkle tree (implemented in Rust), extracts the root hash, and embeds it into a Bitcoin OP_RETURN transaction. The Escrow Service manages PSBT construction and signature collection. All events flow through Kafka, all state persists to PostgreSQL and TimescaleDB, all hot data is cached in Redis, and all file artifacts are stored in S3. The frontend (Next.js web, Flutter mobile) consumes all of this through a unified API Gateway.

---

## 1.2 System Architecture Diagram (Text Form)

```
═══════════════════════════════════════════════════════════════════════════
                          CLIENT LAYER
═══════════════════════════════════════════════════════════════════════════

  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐
  │  Next.js Web App │    │  Flutter Mobile  │    │  External APIs /     │
  │  (TypeScript)    │    │  App (iOS/Android)│    │  IoT Device SDK      │
  │                  │    │                  │    │  / Third-Party       │
  │  Buyer Dashboard │    │  Farmer Flow     │    │  Integrations        │
  │  Auditor Portal  │    │  Consumer QR     │    │                      │
  │  Escrow Manager  │    │  Scan            │    │                      │
  └────────┬─────────┘    └────────┬─────────┘    └──────────┬───────────┘
           │                       │                          │
           └───────────────────────┼──────────────────────────┘
                                   │ HTTPS / WSS
═══════════════════════════════════╪═══════════════════════════════════════
                          API GATEWAY LAYER
═══════════════════════════════════╪═══════════════════════════════════════
                                   ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                      API Gateway (Nginx / Traefik)                  │
  │   Rate Limiting | TLS Termination | JWT Validation | Load Balancing │
  └──────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────┘
         │          │          │          │          │          │
═════════╪══════════╪══════════╪══════════╪══════════╪══════════╪═════════
                          MICROSERVICES LAYER
═════════╪══════════╪══════════╪══════════╪══════════╪══════════╪═════════
         ▼          ▼          ▼          ▼          ▼          ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  Auth    │ │ Shipment │ │ Escrow   │ │  Alert   │ │  Crypto  │ │   ML     │
  │ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │
  │(FastAPI) │ │(FastAPI) │ │(FastAPI+ │ │(FastAPI) │ │  (Rust)  │ │(FastAPI/ │
  │          │ │          │ │  Rust)   │ │          │ │          │ │ PyTorch) │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │   IoT    │ │  Audit   │ │Reporting │ │   User   │
  │Ingestion │ │ Service  │ │ Service  │ │ Service  │
  │ Service  │ │(FastAPI) │ │(FastAPI) │ │(FastAPI) │
  │(FastAPI) │ │          │ │          │ │          │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘
         │          │          │          │          │          │
═════════╪══════════╪══════════╪══════════╪══════════╪══════════╪═════════
                          DATA LAYER
═════════╪══════════╪══════════╪══════════╪══════════╪══════════╪═════════
         ▼          ▼          ▼          ▼          ▼          ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │                         DATA STORES                               │
  │                                                                   │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐  │
  │  │ PostgreSQL   │  │ TimescaleDB  │  │  Redis   │  │    S3    │  │
  │  │ (Primary DB) │  │(IoT Time-    │  │ (Cache + │  │ (Files,  │  │
  │  │ Users,Ships, │  │series Store) │  │  Queue)  │  │  Proofs) │  │
  │  │ Escrow,Audit │  │ Sensor data  │  │          │  │          │  │
  │  └──────────────┘  └──────────────┘  └──────────┘  └──────────┘  │
  └───────────────────────────────────────────────────────────────────┘
═══════════════════════════════════════════════════════════════════════════
                          EVENT LAYER
═══════════════════════════════════════════════════════════════════════════
  ┌───────────────────────────────────────────────────────────────────┐
  │                    Apache Kafka / Redpanda                         │
  │                                                                   │
  │  Topics: shipment.created | sensor.ingested | ml.inference.       │
  │  completed | alert.created | escrow.created | merkle.committed |  │
  │  bitcoin.anchored | custody.handoff | kyc.submitted               │
  └───────────────────────────────────────────────────────────────────┘
═══════════════════════════════════════════════════════════════════════════
                          ML LAYER
═══════════════════════════════════════════════════════════════════════════
  ┌───────────────────┐    ┌────────────────────────────────────────┐
  │  Feature Pipeline │    │         Inference Engine               │
  │                   │    │                                        │
  │  Feature Extractor│    │  Isolation Forest (anomaly)            │
  │  Feature Store    │───▶│  LSTM Autoencoder (time-series)        │
  │  (Redis/Postgres) │    │  Graph Neural Network (route/risk)     │
  │  Normalization    │    │  Ensemble Classifier (provenance)      │
  └───────────────────┘    └────────────────────────────────────────┘
═══════════════════════════════════════════════════════════════════════════
                          CRYPTO LAYER
═══════════════════════════════════════════════════════════════════════════
  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐
  │  Merkle Service │    │  Bitcoin Service  │    │  PSBT Escrow      │
  │  (Rust)         │    │  (Rust + Bitcoin  │    │  Engine (Rust)    │
  │                 │    │   Core RPC)       │    │                   │
  │  Tree Builder   │───▶│  OP_RETURN Embed  │    │  PSBT Builder     │
  │  Proof Gen      │    │  TX Broadcast     │    │  Signature Relay  │
  │  Leaf Hashing   │    │  Confirmation Poll│    │  TX Finalization  │
  └─────────────────┘    └──────────────────┘    └───────────────────┘
═══════════════════════════════════════════════════════════════════════════
                       INFRASTRUCTURE LAYER
═══════════════════════════════════════════════════════════════════════════
  ┌──────────────────────────────────────────────────────────────────┐
  │           Docker Containers + Cloud Infrastructure                │
  │                                                                  │
  │  Docker Compose (Dev) → Kubernetes (Prod)                        │
  │  Horizontal Pod Autoscaling | Load Balancers | Health Checks     │
  │  Centralized Logging (ELK) | Metrics (Prometheus + Grafana)      │
  │  Secret Management (Vault / AWS Secrets Manager)                 │
  └──────────────────────────────────────────────────────────────────┘
```

---

## 1.3 Microservices Breakdown

---

### Auth Service

**Responsibilities:** Issues and validates JWT access tokens and refresh tokens. Manages email/password login, SSO (OAuth2/OIDC via Azure AD, Google, Okta), and TOTP-based 2FA. Enforces account lockout after failed attempts. Manages KYC document submission workflow and status tracking.

**APIs Owned:**
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/2fa/verify`
- `GET /api/v1/auth/sso/{provider}/callback`
- `POST /api/v1/auth/token/refresh`
- `POST /api/v1/kyc/submit`
- `GET /api/v1/kyc/status`

**Database Access:** PostgreSQL — tables: `users`, `organizations`, `sessions`, `kyc_records`, `audit_logs`

**Event Subscriptions:** None (Auth is a source, not a consumer in this context)

**Event Publications:** `kyc.submitted` (triggers ML document verification pipeline)

---

### User Service

**Responsibilities:** Manages user profiles, organization records, RBAC role assignments, and keypair generation for PSBT participation. Handles preferences, notification settings, and wallet linkage for farmers.

**APIs Owned:**
- `GET /api/v1/users/{id}`
- `PATCH /api/v1/users/{id}`
- `GET /api/v1/organizations/{id}`
- `POST /api/v1/users/{id}/keypair/generate`

**Database Access:** PostgreSQL — tables: `users`, `organizations`, `user_preferences`, `wallet_keys`

**Event Subscriptions:** None

**Event Publications:** None

---

### Shipment Service

**Responsibilities:** Core service for shipment lifecycle management. Creates shipment records, binds IoT devices, records chain-of-custody events, triggers ML pre-checks at creation, and maintains the immutable custody ledger. Generates Merkle leaf hashes for each shipment event.

**APIs Owned:**
- `POST /api/v1/shipments`
- `GET /api/v1/shipments`
- `GET /api/v1/shipments/{id}`
- `GET /api/v1/shipments/{id}/telemetry`
- `GET /api/v1/shipments/{id}/custody`
- `GET /api/v1/shipments/{id}/risk`
- `POST /api/v1/shipments/{id}/sensors/bind`
- `POST /api/v1/shipments/{id}/custody`
- `POST /api/v1/shipments/{id}/escrow/init`
- `GET /api/v1/shipments/{id}/proof/pdf`

**Database Access:** PostgreSQL — tables: `shipments`, `shipment_events`, `custody_events`, `iot_devices`, `merkle_leaves`; TimescaleDB — `sensor_readings`

**Event Subscriptions:** `ml.inference.completed` (update cached risk score), `merkle.committed` (update merkle status), `alert.created` (link alert to shipment)

**Event Publications:** `shipment.created`, `custody.handoff`

---

### ML Service

**Responsibilities:** Hosts and serves all ML models. Executes spoilage detection (Isolation Forest + LSTM Autoencoder), route deviation analysis (GNN + LSTM), data tampering detection (Benford's Law, ARIMA), provenance verification (ensemble classifier), and participant risk scoring (GNN). Manages feature extraction, feature storage, model versioning, and inference result publication.

**APIs Owned:**
- `POST /api/v1/ml/risk/precheck`
- `GET /api/v1/ml/shipments/{id}/spoilage-score`
- `GET /api/v1/ml/shipments/{id}/route-analysis`
- `GET /api/v1/ml/shipments/{id}/tampering-analysis`
- `GET /api/v1/ml/participants/{id}/risk-score`
- `GET /api/v1/ml/models/versions`

**Database Access:** PostgreSQL — tables: `ml_inference_results`, `model_versions`, `participant_risk_scores`; Redis — feature cache; TimescaleDB — sensor time-series for feature extraction

**Event Subscriptions:** `shipment.created` (trigger pre-check), `sensor.ingested` (trigger spoilage inference), `custody.handoff` (trigger route analysis)

**Event Publications:** `ml.inference.completed`

---

### Alert Service

**Responsibilities:** Creates, classifies, prioritizes, and delivers alerts generated by ML inference results. Manages alert lifecycle (open, acknowledged, resolved, disputed). Routes notifications via email, in-app, and push channels.

**APIs Owned:**
- `GET /api/v1/alerts`
- `GET /api/v1/alerts/{id}`
- `POST /api/v1/alerts/{id}/acknowledge`
- `POST /api/v1/alerts/{id}/dispute`
- `POST /api/v1/alerts` (internal system use only)

**Database Access:** PostgreSQL — tables: `alerts`, `alert_notifications`, `dispute_tickets`

**Event Subscriptions:** `ml.inference.completed` (evaluate thresholds and generate alert if required)

**Event Publications:** `alert.created`

---

### Escrow Service

**Responsibilities:** Manages escrow agreement lifecycle. Initializes escrow records on shipment creation, coordinates PSBT creation and signature collection with the Crypto Service, triggers release or dispute workflows based on shipment and ML outcomes.

**APIs Owned:**
- `GET /api/v1/escrow`
- `GET /api/v1/escrow/{id}`
- `POST /api/v1/escrow/{id}/psbt/create`
- `POST /api/v1/escrow/{id}/psbt/sign`
- `POST /api/v1/escrow/{id}/release`
- `POST /api/v1/escrow/{id}/dispute`

**Database Access:** PostgreSQL — tables: `escrow_agreements`, `psbt_transactions`, `escrow_events`

**Event Subscriptions:** `shipment.created` (init escrow if configured), `alert.created` (flag escrow for review if critical alert), `merkle.committed` (update escrow audit trail)

**Event Publications:** `escrow.created`, `escrow.settled`, `escrow.disputed`

---

### Crypto Service

**Responsibilities:** Pure Rust service responsible for all cryptographic operations. Builds Merkle trees from event hash batches (SHA-256 leaves, double-SHA-256 internal nodes). Generates Merkle proof paths. Constructs and broadcasts Bitcoin OP_RETURN transactions. Builds, distributes, and finalizes PSBTs for escrow.

**APIs Owned:**
- `POST /api/v1/crypto/merkle/commit` (internal)
- `GET /api/v1/crypto/merkle/{shipment_id}/proof`
- `GET /api/v1/crypto/bitcoin/{shipment_id}/commitment`
- `POST /api/v1/crypto/psbt/create`
- `POST /api/v1/crypto/psbt/{id}/sign`
- `POST /api/v1/crypto/psbt/{id}/broadcast`

**Database Access:** PostgreSQL — tables: `merkle_trees`, `merkle_leaves`, `bitcoin_commitments`, `psbt_records`

**Event Subscriptions:** `shipment.created` (generate Merkle leaf), `custody.handoff` (update Merkle leaf), `escrow.created` (initiate PSBT construction)

**Event Publications:** `merkle.committed`, `bitcoin.anchored`

---

### IoT Ingestion Service

**Responsibilities:** Receives, validates, and persists IoT sensor telemetry from registered devices. Normalizes readings. Batches data for ML inference and Merkle hashing. Detects offline sensors and generates staleness alerts.

**APIs Owned:**
- `POST /api/v1/iot/ingest` (device SDK endpoint)
- `GET /api/v1/iot/devices/{id}/status`

**Database Access:** TimescaleDB — `sensor_readings` hypertable; PostgreSQL — `iot_devices`

**Event Subscriptions:** None (it is a producer)

**Event Publications:** `sensor.ingested`

---

### Audit Service

**Responsibilities:** Maintains the immutable, append-only audit trail for all system actions. Generates audit PDFs and cryptographic proof bundles on demand. Provides read-only access for auditors and regulators.

**APIs Owned:**
- `GET /api/v1/audit/shipments/{id}`
- `GET /api/v1/audit/participants/{id}`
- `GET /api/v1/audit/system/events`

**Database Access:** PostgreSQL — tables: `audit_logs`, `custody_events`; S3 — proof PDFs

**Event Subscriptions:** All Kafka topics (write event to audit log on consumption)

**Event Publications:** None

---

### Reporting Service

**Responsibilities:** Generates aggregate reports for platform KPIs, fraud trend analytics, participant performance, and escrow summaries. Serves regulator and insurer dashboard data endpoints.

**APIs Owned:**
- `GET /api/v1/reports/fraud-trends`
- `GET /api/v1/reports/participant-risk-summary`
- `GET /api/v1/reports/escrow-summary`

**Database Access:** PostgreSQL (read replicas), TimescaleDB continuous aggregates

**Event Subscriptions:** None (reads from DB directly on request)

**Event Publications:** None

---

## 1.4 Data Flow Architecture

### Request Flow

A client (web or mobile) submits an HTTPS request to the API Gateway. The gateway performs TLS termination, validates the JWT using the Auth Service's public key, applies rate limiting, and routes the request to the target microservice. The microservice processes the request, reads or writes to its owned database tables, performs cache lookups or writes via Redis, and returns a structured JSON response. File uploads are streamed to S3, with metadata stored in PostgreSQL.

### Event Flow

All significant state transitions publish a Kafka event. Each Kafka topic has dedicated consumer groups per subscribing service. Consumers process events idempotently using event IDs. Failed messages are retried with exponential backoff before being routed to dead letter queues (DLQs) prefixed `dlq.*`. The Audit Service subscribes to all topics and records every event into the append-only `audit_logs` table.

### ML Flow

IoT data is ingested via the IoT Ingestion Service into TimescaleDB and triggers `sensor.ingested` events on Kafka. The ML Service consumes these events, extracts features from TimescaleDB time-series data, enriches them with PostgreSQL shipment context, and runs inference. Results are written to `ml_inference_results` and cached in Redis keyed by `ml:score:{shipment_id}`. An `ml.inference.completed` event is published. The Alert Service consumes this event and evaluates threshold conditions to generate alerts.

### Crypto Flow

On `shipment.created`, the Crypto Service computes a SHA-256 hash of the shipment data and stores it as a Merkle leaf in PostgreSQL. A scheduled Rust job runs every 10 minutes, collects all uncommitted leaves, constructs the Merkle tree, extracts the root hash, and stores the tree. It then constructs a Bitcoin OP_RETURN transaction embedding the 32-byte root hash, signs it using the system wallet, broadcasts it to the Bitcoin network, and polls for confirmation. On confirmation, `bitcoin.anchored` is published, and all committed events are marked with the Bitcoin transaction ID and block height.

### Escrow Flow

When a shipment is created with escrow enabled, the Escrow Service creates an escrow agreement record and publishes `escrow.created`. The Crypto Service constructs a 2-of-3 multisig PSBT and distributes it to required signatories (buyer and platform escrow key, with seller as third party). Each signatory submits their partial signature via `POST /api/v1/escrow/{id}/psbt/sign`. When the threshold is met, the Crypto Service finalizes the PSBT and broadcasts the funding transaction. On shipment completion and ML confirmation of no anomalies, the release transaction is similarly constructed, signed, and broadcast. On dispute, funds remain locked until auditor resolution.

---

## 1.5 Event-Driven Architecture Design

The following Kafka topics define the system's event backbone. All topics use JSON-serialized event payloads with a mandatory `event_id` (UUID v4), `event_type` (string), `timestamp` (ISO 8601 UTC), `source_service` (string), and `payload` (object) structure.

**shipment.created** — Published by Shipment Service on new shipment insertion. Consumed by: ML Service (pre-check inference), Crypto Service (generate Merkle leaf), Escrow Service (init escrow if configured), Audit Service.

**sensor.ingested** — Published by IoT Ingestion Service on every validated batch of sensor readings. Consumed by: ML Service (spoilage and tampering inference), Crypto Service (batch hash update), Audit Service.

**ml.inference.completed** — Published by ML Service on completion of any inference run. Payload includes: `shipment_id`, `inference_type`, `risk_score`, `model_version`, `features_used`, `confidence`. Consumed by: Alert Service (threshold evaluation), Shipment Service (cache update), Audit Service.

**alert.created** — Published by Alert Service on new alert record creation. Payload includes: `alert_id`, `shipment_id`, `alert_type`, `severity`, `ml_confidence`. Consumed by: Escrow Service (flag escrow if critical), Shipment Service (link alert), Audit Service.

**escrow.created** — Published by Escrow Service on new escrow agreement. Consumed by: Crypto Service (begin PSBT construction), Audit Service.

**escrow.settled** — Published by Escrow Service on successful release transaction broadcast. Consumed by: Shipment Service (update status), Audit Service.

**escrow.disputed** — Published by Escrow Service on dispute initiation. Consumed by: Alert Service (notify auditor), Audit Service.

**custody.handoff** — Published by Shipment Service on new custody event insertion. Consumed by: ML Service (route deviation re-analysis), Crypto Service (update Merkle leaf), Audit Service.

**merkle.committed** — Published by Crypto Service on Merkle tree finalization. Payload includes: `root_hash`, `leaf_count`, `commitment_id`. Consumed by: Shipment Service (mark events as committed), Escrow Service (update audit trail), Audit Service.

**bitcoin.anchored** — Published by Crypto Service on Bitcoin transaction confirmation. Payload includes: `txid`, `block_height`, `block_hash`, `merkle_root`, `commitment_id`. Consumed by: Audit Service, Shipment Service (update on-chain status).

**kyc.submitted** — Published by Auth Service on KYC document upload. Consumed by: ML Service (document verification pipeline), Audit Service.

---

## 1.6 Deployment Architecture

### Containers

Every microservice runs as an isolated Docker container with a minimal base image (Python 3.12-slim for FastAPI services, Rust alpine for Crypto Service). Each container defines explicit CPU and memory resource limits. Docker Compose is used for local development. Kubernetes (or equivalent managed container orchestration) is used for staging and production.

### Service Isolation

Each microservice owns its container, its database schema (enforced via separate PostgreSQL schemas or database users with scoped permissions), its Kafka consumer group, and its Redis key namespace. No service reads directly from another service's database tables. Inter-service communication happens exclusively through Kafka events or synchronous HTTP calls through the API Gateway.

### Horizontal Scaling

Stateless FastAPI services scale horizontally via Kubernetes Horizontal Pod Autoscaler (HPA) triggered by CPU and request queue depth metrics. The ML Service additionally scales based on Kafka consumer lag (via KEDA). The IoT Ingestion Service is scaled to handle burst telemetry loads using replica sets. The Rust Crypto Service is stateless for Merkle construction and Bitcoin RPC calls; PSBT state is held in PostgreSQL, allowing horizontal scaling.

### Load Balancers

Nginx or Traefik serves as the external-facing load balancer and API Gateway, distributing traffic across service replicas using round-robin with session affinity disabled (all services are stateless at the HTTP layer).

### Database Scaling

PostgreSQL is deployed with a primary write node and one or more read replicas. Read-heavy services (Reporting, Audit) are routed to read replicas. TimescaleDB runs as a separate instance with compression policies and continuous aggregates configured for sensor data. Redis is deployed in cluster mode for cache and as a single-primary Sentinel setup for queue-backed jobs.

---

## 1.7 Security Architecture

### JWT Authentication

All API requests require a Bearer JWT in the Authorization header. JWTs are signed using RS256 (RSA 2048-bit key pair). The Auth Service holds the private key and signs tokens on login. All other services validate the token using the public key, which is fetched from a JWKS endpoint on startup and cached. Access tokens expire in 1 hour. Refresh tokens expire in 30 days and are stored in the `sessions` table with a hashed fingerprint.

### RBAC

Role claims are embedded in the JWT payload: `role`, `org_id`, `escrow_limit`, `audit_rights`, `kyc_verified`. FastAPI dependency injection enforces role checks on every protected endpoint. PostgreSQL Row-Level Security (RLS) policies enforce org-level data isolation, ensuring that a shipper organization can only read their own shipments regardless of API-layer bypasses.

### Encryption

All data in transit uses TLS 1.3. All data at rest in PostgreSQL is encrypted via AES-256 at the disk level (cloud provider managed). S3 buckets use server-side encryption (SSE-S3 or SSE-KMS). KYC documents are additionally encrypted with a separate KMS key and purged after verification.

### Key Management

Bitcoin private keys for the system escrow wallet are stored in HashiCorp Vault (or AWS Secrets Manager) with access audit logging. Keys are never stored in environment variables or application code. The Crypto Service fetches the key from Vault on demand using a Vault agent sidecar. Participant keypairs for PSBT signing are generated client-side; only public keys are stored on the platform.

### Bitcoin Key Storage

The system multisig escrow key is a hardware security module (HSM)-backed key in production. On testnet, it is a Vault-managed key. Participant private keys (buyer/seller) never touch the server. PSBTs are distributed as base64-encoded strings to clients for offline signing and returned to the Crypto Service for aggregation.

### Database Security

PostgreSQL enforces Row-Level Security (RLS) per organization. Service accounts use minimal-privilege PostgreSQL roles (e.g., the ML Service role can SELECT from `sensor_readings` and `shipments` but cannot INSERT into `escrow_agreements`). All database passwords are rotated via Vault dynamic secrets. Database connections use TLS with certificate verification.

---

# SECTION 2: LOW LEVEL DESIGN (LLD)

---

## 2.1 Service-by-Service Detailed Design

---

### Auth Service

**Internal Modules:**

**AuthController** — FastAPI router handling all authentication endpoint routes. Validates request payloads using Pydantic models. Delegates business logic to AuthService. Returns structured HTTP responses.

**AuthService** — Core business logic layer. Implements: email/password validation and bcrypt comparison (cost factor 12), TOTP generation and verification using `pyotp`, SSO token exchange via `httpx` OAuth2 client, JWT generation using `python-jose` with RS256, refresh token rotation, account lockout enforcement (Redis counter with TTL), and login anomaly scoring integration.

**UserRepository** — SQLAlchemy async repository for all `users` and `sessions` table operations. Implements: `get_by_email()`, `create_user()`, `update_login_attempt_count()`, `create_session()`, `invalidate_session()`.

**KYCRepository** — Handles all KYC record CRUD. Implements: `create_kyc_record()`, `update_kyc_status()`, `get_pending_reviews()`.

**EventPublisher** — Async Kafka producer publishing `kyc.submitted` events.

**JWTHandler** — Utility module for RS256 token signing and verification. Loads private key from Vault on startup.

---

### Shipment Service

**Internal Modules:**

**ShipmentController** — FastAPI router for all shipment endpoints.

**ShipmentService** — Orchestrates shipment creation: validates fields, triggers ML pre-check via synchronous HTTP to ML Service, uploads manifest files to S3 via `boto3`, creates shipment record, binds IoT devices, initializes escrow record via Escrow Service HTTP call, computes Merkle leaf hash via Crypto Service call, and publishes `shipment.created` Kafka event.

**ShipmentRepository** — SQLAlchemy async operations on `shipments`, `shipment_events`, `custody_events`, `iot_devices` tables.

**SensorRepository** — TimescaleDB-specific async queries for `sensor_readings` time-series. Uses `asyncpg` for native async timescale queries.

**ShipmentEventPublisher** — Async Kafka producer for `shipment.created` and `custody.handoff` topics.

**MLResultHandler** — Kafka consumer for `ml.inference.completed` events. Updates Redis cache key `ml:score:{shipment_id}` on receipt.

**MerkleStatusHandler** — Kafka consumer for `merkle.committed` events. Marks corresponding shipment events as `bitcoin_committed = true` in PostgreSQL.

---

### ML Service

**Internal Modules:**

**MLController** — FastAPI router for all ML inference API endpoints.

**MLService** — Orchestrates inference pipeline: fetches features from TimescaleDB and PostgreSQL, runs model-specific inference, writes results to `ml_inference_results`, caches risk score in Redis, and publishes `ml.inference.completed`.

**FeatureExtractor** — Extracts and engineers features from raw sensor time-series and shipment metadata. Implements: `compute_cumulative_exposure()`, `compute_rate_of_change()`, `compute_route_deviation_score()`, `compute_provenance_score()`, `compute_handling_violation_score()`.

**IsolationForestInferrer** — Loads serialized scikit-learn `IsolationForest` model from disk (model registry). Runs point anomaly detection on sensor feature vectors.

**LSTMAutoencoderInferrer** — Loads PyTorch LSTM Autoencoder model. Reconstructs input time-series sequences and computes reconstruction error as anomaly score.

**GNNInferrer** — Loads PyTorch Geometric GNN model. Runs route verification and participant risk scoring over supply chain graph data.

**EnsembleClassifier** — Loads provenance verification ensemble model (Random Forest + XGBoost). Produces provenance authenticity probability.

**ModelRegistry** — Manages model versioning. Loads models from local disk path or S3 model artifact store. Implements model version lookup and active version management.

**MLResultRepository** — Async SQLAlchemy for `ml_inference_results` and `model_versions` tables.

**MLEventConsumer** — Kafka consumer group for `shipment.created`, `sensor.ingested`, `custody.handoff`. Dispatches to appropriate inference pipeline.

**MLEventPublisher** — Kafka producer for `ml.inference.completed`.

---

### Crypto Service (Rust)

**Internal Modules:**

**MerkleModule** — Pure Rust implementation of Merkle tree construction. Uses `sha2` crate for SHA-256 leaf hashing and double-SHA-256 internal node hashing. Implements `build_tree()`, `get_root()`, `generate_proof_path()`.

**BitcoinModule** — Uses `bitcoin` Rust crate and `bitcoincore-rpc` for OP_RETURN transaction construction, signing, broadcasting, and confirmation polling. Implements `build_op_return_tx()`, `sign_tx()`, `broadcast_tx()`, `poll_confirmation()`.

**PSBTModule** — Uses `bitcoin` crate PSBT primitives. Implements `create_multisig_psbt()`, `add_signature()`, `finalize_psbt()`, `broadcast_finalized_psbt()`.

**CryptoRepository** — Async PostgreSQL client using `sqlx` crate. Manages `merkle_trees`, `merkle_leaves`, `bitcoin_commitments`, `psbt_records` tables.

**SchedulerModule** — Tokio async scheduler running the 10-minute Merkle batch job and Bitcoin confirmation polling loop.

**EventConsumer** — Kafka consumer using `rdkafka` Rust crate. Subscribes to `shipment.created`, `custody.handoff`, `escrow.created`.

**EventPublisher** — Kafka producer for `merkle.committed`, `bitcoin.anchored`.

---

### Escrow Service

**Internal Modules:**

**EscrowController** — FastAPI router for all escrow endpoints.

**EscrowService** — Orchestrates escrow lifecycle: creates agreement records, coordinates with Crypto Service for PSBT operations, evaluates release conditions, manages dispute state transitions.

**EscrowRepository** — Async SQLAlchemy for `escrow_agreements`, `psbt_transactions`, `escrow_events`.

**ReleaseConditionEvaluator** — Evaluates whether configured release conditions are satisfied: ML risk score below threshold, no open critical alerts, delivery confirmation present.

**EscrowEventPublisher** — Kafka producer for `escrow.created`, `escrow.settled`, `escrow.disputed`.

**AlertConsumer** — Kafka consumer for `alert.created`. Flags escrow for review on critical alerts.

---

### IoT Ingestion Service

**Internal Modules:**

**IngestionController** — FastAPI router for `POST /api/v1/iot/ingest`. Validates device authentication (HMAC-signed device token), validates payload schema, normalizes readings.

**IngestionService** — Batches validated readings for TimescaleDB bulk insert. Detects missing device heartbeat and triggers staleness record.

**SensorRepository** — Async `asyncpg` client for bulk insert to TimescaleDB `sensor_readings` hypertable.

**DeviceRegistry** — Manages `iot_devices` table lookups for device authentication and shipment binding validation.

**IngestionEventPublisher** — Kafka producer for `sensor.ingested`.

---

### Alert Service

**Internal Modules:**

**AlertController** — FastAPI router for alert endpoints.

**AlertService** — Creates alert records from ML inference results. Classifies severity (Info, Warning, Critical) based on configurable threshold table. Routes notifications via email (SendGrid/SES), in-app WebSocket push, and mobile push (FCM/APNs).

**AlertRepository** — Async SQLAlchemy for `alerts`, `alert_notifications`, `dispute_tickets`.

**ThresholdEvaluator** — Reads alert threshold configuration from PostgreSQL `alert_thresholds` table (configurable per cargo category and alert type). Evaluates ML inference results against thresholds.

**NotificationDispatcher** — Sends email and push notifications. Uses async HTTP client for external notification APIs.

**MLResultConsumer** — Kafka consumer for `ml.inference.completed`. Triggers threshold evaluation on each result.

**AlertEventPublisher** — Kafka producer for `alert.created`.

---

## 2.2 API Design

---

### POST /api/v1/auth/login

**Request:**
```json
{
  "email": "user@company.com",
  "password": "SecurePass123!",
  "remember_device": false
}
```
**Response (200):**
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<uuid>",
  "expires_in": 3600,
  "user": {
    "id": "usr_abc123",
    "email": "user@company.com",
    "role": "buyer",
    "org_id": "org_xyz",
    "kyc_verified": true
  }
}
```
**Auth:** None (public endpoint)
**Business Logic:** Validate email format → lookup user by email → bcrypt compare → check account status → check lockout counter in Redis (`lockout:{email}`) → generate RS256 JWT → write session to PostgreSQL → log login event
**Database:** SELECT `users`; INSERT `session_logs`
**Events Triggered:** None (audit log written directly)
**Error Responses:** 401 (invalid credentials), 423 (account locked), 403 (account suspended), 422 (validation error)

---

### POST /api/v1/shipments

**Request:**
```json
{
  "origin_port": "INBOM",
  "destination_port": "GBLON",
  "carrier_entity": "org_carrier_123",
  "estimated_departure": "2026-03-01T06:00:00Z",
  "manifest_description": "500kg Alphonso Mangoes",
  "cargo_category": "fresh_produce",
  "weight_kg": 500,
  "sensor_device_ids": ["dev_001", "dev_002"],
  "buyer_org_id": "org_buyer_456",
  "escrow_amount_usd": 15000,
  "release_conditions": {
    "max_risk_score": 30,
    "require_delivery_confirmation": true
  }
}
```
**Response (201):**
```json
{
  "shipment_id": "SHP-00012",
  "status": "active",
  "ml_precheck_score": 18,
  "merkle_leaf_hash": "a3f4c2...",
  "escrow_agreement_id": "esc_001",
  "created_at": "2026-02-20T10:00:00Z"
}
```
**Auth:** JWT required — roles: `shipper`, `enterprise_admin`
**Business Logic:** Validate all fields → trigger ML pre-check (HTTP POST to ML Service) → upload manifest files to S3 → INSERT shipment record → bind IoT devices → call Escrow Service to initialize escrow → call Crypto Service to compute and store Merkle leaf → publish `shipment.created` to Kafka
**Database:** INSERT `shipments`, `iot_devices`, `escrow_agreements`, `merkle_leaves`
**Events Triggered:** `shipment.created`

---

### POST /api/v1/iot/ingest

**Request:**
```json
{
  "device_id": "dev_001",
  "shipment_id": "SHP-00012",
  "readings": [
    {
      "timestamp": "2026-02-20T10:05:00Z",
      "temperature_celsius": 3.4,
      "humidity_percent": 82.1,
      "latitude": 18.9667,
      "longitude": 72.8333,
      "tilt_degrees": 2.1
    }
  ],
  "device_signature": "hmac_sha256_hex"
}
```
**Response (202):**
```json
{
  "accepted": true,
  "reading_count": 1,
  "batch_id": "batch_uuid"
}
```
**Auth:** HMAC device token (not JWT — IoT devices use pre-shared keys)
**Business Logic:** Validate device HMAC signature → validate device is bound to stated shipment → normalize readings → bulk insert to TimescaleDB → publish `sensor.ingested`
**Database:** INSERT `sensor_readings` (TimescaleDB hypertable)
**Events Triggered:** `sensor.ingested`

---

### POST /api/v1/crypto/merkle/commit (Internal)

**Request:**
```json
{
  "batch_id": "batch_uuid",
  "leaf_hashes": ["a3f4c2...", "b5d3e1...", "c7a8f9..."]
}
```
**Response (200):**
```json
{
  "merkle_root": "f9a3b2c1...",
  "commitment_id": "cmmt_001",
  "leaf_count": 3,
  "proof_paths": {
    "a3f4c2...": ["sibling_hash_1", "sibling_hash_2"]
  }
}
```
**Auth:** Internal service-to-service mTLS only (not exposed through public API Gateway)
**Business Logic:** Build Merkle tree from leaf_hashes in Rust → store root and paths to PostgreSQL → trigger Bitcoin anchoring job asynchronously → publish `merkle.committed`
**Events Triggered:** `merkle.committed`, `bitcoin.anchored` (async after confirmation)

---

### POST /api/v1/escrow/{id}/psbt/sign

**Request:**
```json
{
  "signer_role": "buyer",
  "partial_signature": "base64_encoded_psbt_with_signature"
}
```
**Response (200):**
```json
{
  "psbt_id": "psbt_001",
  "signatures_collected": 1,
  "signatures_required": 2,
  "status": "awaiting_signatures"
}
```
**Auth:** JWT required — role must match signer_role claim
**Business Logic:** Validate partial PSBT signature using `bitcoin` Rust library → store partial signature → if threshold reached: finalize PSBT and broadcast → update escrow status → publish `escrow.settled`
**Events Triggered:** `escrow.settled` (if threshold met)

---

## 2.3 Database Design

### PostgreSQL Tables

**users** — Stores all user accounts. Primary key: `id` (UUID). Fields: `email` (unique, indexed), `password_hash` (bcrypt), `role` (enum: shipper, carrier, auditor, financier, admin), `org_id` (FK → organizations), `kyc_status` (enum: pending, approved, rejected), `status` (enum: active, suspended, pending_email_verification), `created_at`, `updated_at`. Indexes: `idx_users_email`, `idx_users_org_id`.

**organizations** — Stores registered companies. Primary key: `id` (UUID). Fields: `legal_name`, `tax_id` (unique), `hq_country`, `status` (enum: pending_verification, active, suspended), `created_at`. Indexes: `idx_org_tax_id`.

**shipments** — Core shipment records. Primary key: `id` (UUID, formatted as SHP-XXXXX). Fields: `org_id` (FK → organizations), `carrier_org_id`, `origin_port`, `destination_port`, `cargo_category`, `weight_kg`, `status` (enum: draft, active, in_transit, delivered, disputed), `ml_risk_score` (decimal), `merkle_leaf_hash` (varchar 64), `estimated_departure`, `actual_arrival`, `created_at`. Indexes: `idx_shipments_org_id`, `idx_shipments_status`, `idx_shipments_created_at` (BRIN index for time-range queries).

**custody_events** — Immutable custody handoff ledger. Primary key: `id` (UUID). Fields: `shipment_id` (FK), `custodian_org_id` (FK), `event_type` (enum: pickup, handoff, delivery), `gps_latitude`, `gps_longitude`, `ecdsa_signature` (text), `signature_public_key`, `event_hash` (SHA-256 of event data), `previous_event_hash` (hash chain), `timestamp`. Indexes: `idx_custody_shipment_id`.

**sensor_readings (TimescaleDB hypertable)** — Time-series sensor data. Partitioned by `timestamp` (7-day chunks). Fields: `device_id`, `shipment_id`, `timestamp` (PRIMARY partition key), `temperature_celsius`, `humidity_percent`, `latitude`, `longitude`, `tilt_degrees`. TimescaleDB continuous aggregates: 1-hour and 1-day materialized aggregations for temperature mean, min, max.

**ml_inference_results** — ML output storage. Fields: `id`, `shipment_id`, `inference_type` (enum: spoilage, route_deviation, tampering, provenance, participant_risk), `risk_score` (decimal 0-100), `model_version_id` (FK), `features_snapshot` (JSONB), `confidence` (decimal), `anomaly_flag` (boolean), `created_at`. Indexes: `idx_ml_shipment_id`, `idx_ml_created_at`.

**alerts** — Alert records. Fields: `id`, `shipment_id`, `alert_type` (enum: route_deviation, sensor_breach, unscheduled_handover, ml_risk_trend), `severity` (enum: info, warning, critical), `status` (enum: open, acknowledged, resolved, disputed), `ml_confidence`, `message`, `created_at`. Indexes: `idx_alerts_shipment_id`, `idx_alerts_severity`, `idx_alerts_status`.

**escrow_agreements** — Escrow contract records. Fields: `id`, `shipment_id` (FK), `buyer_org_id`, `seller_org_id`, `amount_satoshis`, `release_conditions` (JSONB), `status` (enum: initialized, funded, released, disputed, cancelled), `bitcoin_funding_txid`, `bitcoin_release_txid`. Indexes: `idx_escrow_shipment_id`, `idx_escrow_status`.

**psbt_transactions** — PSBT lifecycle records. Fields: `id`, `escrow_agreement_id` (FK), `psbt_type` (enum: funding, release, dispute_resolution), `psbt_base64` (text — latest PSBT state), `signatures` (JSONB — map of role to partial sig), `status` (enum: pending, partially_signed, finalized, broadcast), `txid` (on broadcast), `created_at`.

**merkle_trees** — Merkle commitment records. Fields: `id`, `root_hash` (varchar 64, unique), `leaf_count` (integer), `commitment_timestamp`, `bitcoin_commitment_id` (FK, nullable until anchored).

**merkle_leaves** — Individual leaf records. Fields: `id`, `tree_id` (FK, nullable until committed), `shipment_id`, `event_type`, `leaf_hash` (varchar 64), `committed` (boolean), `created_at`.

**bitcoin_commitments** — Bitcoin anchoring records. Fields: `id`, `merkle_tree_id` (FK), `txid` (varchar 64, unique), `block_height`, `block_hash`, `network` (enum: testnet, mainnet), `confirmed_at`.

**audit_logs** — Append-only system event log. Fields: `id` (UUID), `event_type` (string), `source_service` (string), `entity_type`, `entity_id`, `actor_user_id`, `payload` (JSONB), `timestamp`. No UPDATE or DELETE grants on this table. Indexes: `idx_audit_entity`, `idx_audit_timestamp`.

**model_versions** — ML model registry. Fields: `id`, `model_type` (enum: isolation_forest, lstm_autoencoder, gnn, ensemble), `version_tag` (semver string), `artifact_s3_path`, `is_active` (boolean), `trained_at`, `deployed_at`.

---

## 2.4 ML Pipeline Design

### Feature Ingestion

Raw data enters from two sources: real-time Kafka events (`sensor.ingested`, `shipment.created`, `custody.handoff`) and batch queries to TimescaleDB for time-window feature computation. On receipt of `sensor.ingested`, the ML Service FeatureExtractor queries the last 24 hours of `sensor_readings` for the device's shipment from TimescaleDB using asyncpg.

### Feature Engineering

The following features are computed per inference cycle:

- **cumulative_exposure** — Sum of (temperature × duration) over all readings exceeding the baseline threshold for the cargo category. Computed with a TimescaleDB window function.
- **rate_of_temperature_change** — Rolling 5-minute slope of temperature readings. Computed as `REGR_SLOPE(temperature_celsius, extract(epoch from timestamp))` over a time window.
- **route_deviation_score** — Haversine distance from GPS coordinates to the nearest point on the planned route polyline, normalized to a 0–100 scale.
- **handling_violation_score** — Count and severity-weighted sum of tilt_degrees readings exceeding configured per-category thresholds.
- **provenance_consistency_score** — Composite score from: custody event timing regularity, GPS corridor adherence, certification metadata consistency.
- **participant_risk_history** — Pre-computed daily GNN-based risk score for each carrier and custodian org, stored in PostgreSQL `participant_risk_scores` and fetched at inference time.

Features are stored transiently in Redis under key `ml:features:{shipment_id}:{inference_type}:{timestamp}` with a 30-minute TTL for idempotent re-use.

### Inference Triggering

Inference is triggered by Kafka event consumption (asynchronous, near-real-time) or by synchronous HTTP call for the creation-time pre-check (`POST /api/v1/ml/risk/precheck`). Each trigger dispatches to the appropriate inference function in MLService.

### Inference Serving

Isolation Forest: `scikit-learn` model loaded at startup from disk path registered in `model_versions`. `predict()` returns -1 (anomaly) or 1 (normal). Anomaly score mapped to 0–100 scale using contamination-adjusted normalization.

LSTM Autoencoder: PyTorch model loaded at startup. Input is a tensor of shape `(sequence_length, num_features)` where sequence_length is the last 60 readings (1-hour window at 60s intervals). Reconstruction error (MSE) is computed and compared against a trained threshold to produce an anomaly probability.

GNN: PyTorch Geometric model operating on a heterogeneous graph where nodes are shipments, organizations, and routes, and edges are custody events and carrier relationships. Node feature vectors are updated per inference run. Output is an anomaly probability per shipment node.

Ensemble Classifier: XGBoost + Random Forest stacking ensemble for provenance verification. Input is a feature vector of engineered features. Output is a probability (0.0–1.0) of authentic provenance.

### Model Versioning

The ModelRegistry reads the active model version from `model_versions` on service startup. Model artifacts are stored as serialized files in S3 (pickle for scikit-learn, `.pt` for PyTorch). A version upgrade involves: uploading the new artifact to S3, inserting a new row in `model_versions` with `is_active=false`, and then atomically updating `is_active=true` for the new version and `is_active=false` for the old version. The ML Service reloads the active model from S3 on a configurable interval (default: 5 minutes) without restart.

---

## 2.5 Crypto Service Design

### Merkle Tree Construction (Rust)

Every supply chain event (shipment creation, custody handoff, sensor batch hash) produces a leaf. The leaf is computed as `SHA-256(event_type || shipment_id || timestamp || event_payload_json)` using the `sha2` crate. Leaves are stored in `merkle_leaves` with `committed = false`.

The Rust scheduler runs every 10 minutes via a Tokio interval task. It queries all rows in `merkle_leaves` where `committed = false`. If zero leaves exist, the cycle is skipped and logged. Otherwise, the `MerkleModule.build_tree()` function:
1. Sorts leaves by `created_at` for deterministic ordering
2. Computes SHA-256 of each leaf hash (double-hashing for Merkle convention)
3. Iteratively hashes sibling pairs until a single root remains
4. If the leaf count is odd, the last leaf is duplicated
5. Stores the full tree (all intermediate nodes and the root) in `merkle_trees`
6. Generates a proof path for each leaf (sibling hash chain from leaf to root) and stores in `merkle_leaves` (the `proof_path` JSONB column)
7. Marks all processed leaves as `committed = true` with the `tree_id` FK

### Bitcoin Anchoring (Rust)

After Merkle tree construction, `BitcoinModule.build_op_return_tx()` constructs a Bitcoin transaction:
- Input: A UTXO from the system wallet with sufficient balance (fetched via `bitcoincore-rpc`)
- Output 1: `OP_RETURN <merkle_root_32_bytes>` — zero-value data output
- Output 2: Change output back to system wallet, minus miner fee
- Fee estimation: `estimatesmartfee` RPC call targeting 1-block confirmation

The transaction is signed using the system wallet private key retrieved from Vault. It is broadcast via `sendrawtransaction` RPC. A Tokio background task polls `gettransaction` every 30 seconds until `confirmations >= 1`. On confirmation, the `bitcoin_commitments` record is created and `bitcoin.anchored` is published to Kafka. If confirmation times out after 20 minutes, Replace-By-Fee (RBF) is used to bump the fee and re-broadcast (maximum 3 attempts). If all attempts fail, an ops alert is raised and the commitment is queued for the next Merkle cycle.

### PSBT Construction (Rust)

`PSBTModule.create_multisig_psbt()` constructs a 2-of-3 multisig P2WSH (Pay-to-Witness-Script-Hash) PSBT:
1. Derives the 3 public keys: buyer_pubkey, seller_pubkey, platform_escrow_pubkey
2. Constructs the 2-of-3 multisig redeem script
3. Wraps in a P2WSH output
4. Creates an unsigned PSBT (as per BIP-174) funding the multisig address with `escrow_amount_satoshis`
5. Serializes to base64 and stores in `psbt_transactions.psbt_base64`
6. Sets `status = pending`

The PSBT is distributed to buyer and seller (or platform if acting as co-signer) via the API response to `GET /api/v1/escrow/{id}/psbt`. Each party signs offline using their private key with a Bitcoin-compatible wallet. The partial signature is submitted to `POST /api/v1/escrow/{id}/psbt/sign`. The Crypto Service validates the partial signature's correctness against the PSBT using the `bitcoin` crate's PSBT signing primitives, stores it in `psbt_transactions.signatures` JSONB, and updates the PSBT base64 with the merged signature. When 2 of 3 signatures are present, `PSBTModule.finalize_psbt()` is called to produce a fully signed transaction, which is then broadcast via Bitcoin Core RPC.

---

## 2.6 Event Processing Design

### Event Producers

All Kafka producers use `aiokafka` (for FastAPI Python services) or `rdkafka` (for Rust Crypto Service). Producers are configured with `acks=all` (wait for all in-sync replicas), `enable.idempotence=true` (exactly-once delivery at producer level), and `compression.type=lz4`.

### Event Consumers

Each consumer runs in a dedicated async loop within its service. Consumer group IDs follow the pattern `{service_name}-consumer-group`. Consumers process events one partition at a time. After processing, offsets are committed manually (not auto-commit) to ensure at-least-once delivery semantics. Processing logic is idempotent: all operations check for existing records by `event_id` before inserting.

### Kafka Topics

All topics are configured with: `replication.factor=3`, `min.insync.replicas=2`, `retention.ms=604800000` (7 days), `cleanup.policy=delete`. Topic-level settings:
- `sensor.ingested`: `retention.ms=86400000` (1 day — high volume, short retention), 12 partitions, keyed by `device_id`
- `shipment.created`: 6 partitions, keyed by `shipment_id`
- `ml.inference.completed`: 6 partitions, keyed by `shipment_id`
- `alert.created`: 3 partitions, keyed by `shipment_id`
- `merkle.committed`: 1 partition (low volume, ordered)
- `bitcoin.anchored`: 1 partition

### Retry Mechanisms

Failed message processing retries with exponential backoff: 1s, 2s, 4s, 8s (maximum 3 retries per consumer). If all retries are exhausted, the raw message is written to a DLQ topic prefixed `dlq.{original_topic}` with an error metadata envelope (service, error type, timestamp, retry_count). A DLQ monitoring alert is triggered for any message sent to a DLQ. A separate DLQ processor service can replay DLQ messages after manual review.

### Dead Letter Queues

DLQ topics: `dlq.shipment.created`, `dlq.sensor.ingested`, `dlq.ml.inference.completed`, etc. DLQ messages include the original payload, consumer group, partition, offset, and error reason. DLQ retention: 30 days. Ops dashboard shows DLQ depth for alerting.

---

## 2.7 Transaction Flow Designs

---

### Shipment Creation Flow (Step-by-Step)

1. Client sends `POST /api/v1/shipments` with JWT (role: shipper)
2. API Gateway validates JWT, routes to Shipment Service
3. ShipmentController receives request, validates Pydantic model
4. ShipmentService calls ML Service `POST /api/v1/ml/risk/precheck` synchronously (HTTP, timeout 5s)
5. ML Service runs ensemble pre-check on route + carrier + cargo type; returns risk score
6. ShipmentService uploads manifest files to S3; stores S3 keys in payload
7. ShipmentService calls ShipmentRepository to INSERT `shipments` record with status `active`
8. ShipmentService calls DeviceRegistry to validate and bind each `device_id` in `iot_devices`
9. ShipmentService calls Escrow Service `POST /api/v1/escrow/init` to create `escrow_agreements` record
10. ShipmentService calls Crypto Service `POST /api/v1/crypto/merkle/leaf` to compute and store Merkle leaf hash
11. ShipmentService calls ShipmentEventPublisher to publish `shipment.created` to Kafka
12. ShipmentService returns 201 response to client with `shipment_id`, `ml_precheck_score`, `merkle_leaf_hash`
13. **Async:** ML Service consumes `shipment.created`, schedules full inference run
14. **Async:** Audit Service consumes `shipment.created`, inserts `audit_logs` record

---

### ML Inference Flow (Step-by-Step)

1. IoT device calls `POST /api/v1/iot/ingest` with sensor batch
2. IoT Ingestion Service validates HMAC, inserts to TimescaleDB `sensor_readings`
3. IoT Ingestion Service publishes `sensor.ingested` to Kafka
4. ML Service Kafka consumer receives `sensor.ingested` event
5. FeatureExtractor queries TimescaleDB for last 60 readings of the shipment
6. FeatureExtractor computes: cumulative_exposure, rate_of_change, handling_violation_score
7. IsolationForestInferrer loads active model from ModelRegistry, runs `predict()` on feature vector
8. LSTMAutoencoderInferrer reconstructs 60-reading sequence, computes reconstruction MSE
9. MLService averages both model outputs into composite spoilage risk score (0–100)
10. MLResultRepository INSERTs row into `ml_inference_results`
11. Redis cache updated: `SET ml:score:{shipment_id} {score} EX 300`
12. MLEventPublisher publishes `ml.inference.completed` to Kafka
13. **Async:** Alert Service consumes event, evaluates threshold
14. **Async:** Shipment Service consumes event, updates `shipments.ml_risk_score`
15. **Async:** Audit Service inserts `audit_logs` record

---

### Alert Generation Flow (Step-by-Step)

1. Alert Service Kafka consumer receives `ml.inference.completed`
2. ThresholdEvaluator fetches active threshold config for this cargo category from `alert_thresholds`
3. ThresholdEvaluator compares risk score against WARNING (50) and CRITICAL (75) thresholds
4. If below WARNING: no action, return
5. If WARNING or CRITICAL: AlertService creates `alerts` record with computed severity and message
6. AlertRepository INSERTs alert record
7. AlertEventPublisher publishes `alert.created` to Kafka
8. NotificationDispatcher sends push notification to buyer and logistics user (FCM/APNs)
9. NotificationDispatcher sends email alert via SendGrid
10. **Async:** Escrow Service consumes `alert.created`; if severity=CRITICAL, updates `escrow_agreements.status = flagged_for_review`
11. **Async:** Shipment Service links alert to shipment
12. **Async:** Audit Service records alert event

---

### Escrow Creation Flow (Step-by-Step)

1. Shipment Service calls `POST /api/v1/escrow/init` during shipment creation
2. Escrow Service validates buyer org's KYC status and escrow limit
3. EscrowRepository INSERTs `escrow_agreements` record with `status = initialized`
4. Escrow Service publishes `escrow.created` to Kafka
5. Crypto Service consumes `escrow.created` event
6. PSBTModule fetches buyer_pubkey, seller_pubkey from `wallet_keys` table; uses platform escrow pubkey from Vault
7. PSBTModule constructs 2-of-3 P2WSH multisig PSBT
8. PSBTRepository INSERTs `psbt_transactions` record with `status = pending`, `psbt_base64`
9. Buyer calls `GET /api/v1/escrow/{id}/psbt` and receives the base64 PSBT
10. Buyer signs PSBT offline using their private key
11. Buyer submits `POST /api/v1/escrow/{id}/psbt/sign` with partial signature
12. Crypto Service validates signature, stores in PSBT record, updates PSBT base64
13. Platform co-signs as second signer (automated)
14. Threshold met (2-of-3): PSBTModule finalizes PSBT, broadcasts funding transaction via Bitcoin Core RPC
15. EscrowRepository updates `escrow_agreements.status = funded`, stores `bitcoin_funding_txid`
16. Escrow Service publishes `escrow.settled` (funding leg complete)

---

### Escrow Settlement (Release) Flow (Step-by-Step)

1. Shipment status updated to `delivered`
2. ReleaseConditionEvaluator checks: `ml_risk_score < max_risk_score` AND `no open critical alerts` AND `delivery_confirmation = true`
3. If conditions met: Escrow Service creates release PSBT
4. PSBTModule constructs release transaction spending the multisig UTXO to seller's address
5. Platform auto-signs (1 of 2 required)
6. Release PSBT distributed to buyer for second signature
7. Buyer signs and submits partial signature
8. Crypto Service finalizes and broadcasts release transaction
9. EscrowRepository updates `status = released`, stores `bitcoin_release_txid`
10. Escrow Service publishes `escrow.settled`

---

### Merkle Commitment Flow (Step-by-Step)

1. Rust Tokio scheduler fires every 10 minutes
2. CryptoRepository queries `merkle_leaves WHERE committed = false`
3. If zero leaves: log and skip
4. MerkleModule.build_tree() sorts leaves by `created_at`, computes SHA-256 of each, builds tree bottom-up
5. Root hash extracted
6. CryptoRepository INSERTs `merkle_trees` record (root_hash, leaf_count, commitment_timestamp)
7. CryptoRepository updates each leaf: `committed = true, tree_id = <new_tree_id>, proof_path = <json_array>`
8. EventPublisher publishes `merkle.committed` with root_hash and commitment_id
9. BitcoinModule.build_op_return_tx() constructs OP_RETURN transaction embedding root_hash
10. BitcoinModule.sign_tx() signs with system wallet key from Vault
11. BitcoinModule.broadcast_tx() calls `sendrawtransaction` via Bitcoin Core RPC
12. Confirmation polling task starts: checks every 30 seconds
13. On 1+ confirmations: CryptoRepository INSERTs `bitcoin_commitments` record
14. EventPublisher publishes `bitcoin.anchored` with txid and block_height

---

## 2.8 Caching Design

**ML Risk Scores**
- Redis key: `ml:score:{shipment_id}`
- Value: JSON string `{"risk_score": 42.5, "inference_type": "spoilage", "model_version": "1.3.0", "computed_at": "2026-02-20T10:00:00Z"}`
- TTL: 300 seconds (5 minutes). Stale on TTL expiry; Shipment Service re-triggers inference if cache miss
- Invalidation: Explicit delete on receipt of `ml.inference.completed` before setting new value (cache-aside pattern)

**User Sessions**
- Redis key: `session:{user_id}:{session_id}`
- Value: JSON session metadata (role, org_id, device fingerprint hash)
- TTL: 3600 seconds (access token lifetime)
- Invalidation: Explicit delete on logout or token refresh

**Alert Thresholds**
- Redis key: `alert:thresholds:{cargo_category}`
- Value: JSON threshold configuration
- TTL: 3600 seconds. Refreshed from PostgreSQL `alert_thresholds` table on cache miss
- Invalidation: Admin updates threshold → explicit cache delete via admin API call

**Shipment Summary Cache (List View)**
- Redis key: `shipments:list:{org_id}:{page}:{filters_hash}`
- Value: JSON-serialized paginated shipment list
- TTL: 60 seconds (short-lived for near-real-time updates)
- Invalidation: On `shipment.created` event consumption, delete all keys matching `shipments:list:{org_id}:*` using Redis SCAN + DEL

**IoT Device Registry**
- Redis key: `iot:device:{device_id}`
- Value: JSON device record (shipment_id, auth_key_hash, status)
- TTL: 600 seconds
- Invalidation: On device re-binding event

---

## 2.9 Concurrency and Scaling Design

### Thread Model (FastAPI Services)

FastAPI services run under `uvicorn` with `--workers` set to `1` per container (containerized horizontal scaling is preferred over forking). All I/O operations (database, Kafka, Redis, HTTP) are async using `asyncio`. CPU-bound tasks (feature extraction for large sensor windows) are offloaded to a `ProcessPoolExecutor` thread pool using `loop.run_in_executor()`.

### Async Tasks

Background Kafka consumers run as `asyncio` tasks alongside the FastAPI event loop. Background tasks for cache warming and notification dispatching are spawned using FastAPI's `BackgroundTasks` or `asyncio.create_task()`. Long-running PDF generation is dispatched as a Celery task to a separate worker queue backed by Redis.

### Queue Processing

The Celery worker pool is used for: proof PDF generation (`GET /api/v1/shipments/{id}/proof/pdf`), ML model retraining jobs (triggered by scheduled events), and DLQ replay jobs. Celery uses Redis as the broker and result backend. Workers are scaled horizontally based on queue depth.

### Horizontal Scaling

Shipment Service: Scale to 3–10 replicas based on request rate. Stateless (all state in PostgreSQL + Redis).

ML Service: Scale to 2–8 replicas based on Kafka consumer lag (KEDA `KafkaTrigger`). Each replica loads models into memory on startup from S3 (model loading takes 5–30 seconds; readiness probe delays traffic).

IoT Ingestion Service: Scale to 5–20 replicas during peak ingestion windows. TimescaleDB bulk insert performance is the bottleneck; tune `max_connections` and use connection pooling via `PgBouncer`.

Crypto Service (Rust): Scale to 2–4 replicas. Merkle batch job uses leader election via PostgreSQL advisory lock to ensure only one replica runs the batch job per cycle.

---

## 2.10 Failure Handling Design

### Retries

All synchronous HTTP calls between services use `httpx` with retry configuration: 3 retries with exponential backoff (1s, 2s, 4s) on `5xx` responses and network errors. Kafka consumer retries: 3 attempts with exponential backoff before DLQ routing. Bitcoin transaction broadcast: RBF fee bumping with 3 retry attempts over 20 minutes.

### Rollback

Shipment creation is wrapped in an application-level saga pattern (not a distributed transaction). If any step fails (S3 upload, escrow init, Merkle leaf computation), the ShipmentService executes compensating operations: marks the shipment as `status = draft`, deletes partial IoT device bindings, and returns the `draft_id` to the client for recovery. Each step is designed to be idempotent so that retried requests do not create duplicate records.

### Event Replay

Events committed to Kafka can be replayed by resetting consumer group offsets to a specific timestamp or offset. Topic retention of 7 days allows replay up to 7 days back. The Audit Service uses a separate consumer group with `auto.offset.reset=earliest` and processes all events idempotently using the `event_id` field as a deduplication key.

### Data Consistency

The system uses eventual consistency between services. PostgreSQL is the authoritative source of truth for all business entities. Redis caches are treated as non-authoritative and can be safely flushed without data loss. Kafka events are the authoritative record of state transitions and can reconstruct the current state of any entity by replaying them in order. The `audit_logs` table captures every state transition and is never updated or deleted, enabling full audit reconstruction.

---

# SECTION 3: SEQUENCE FLOWS

---

## 3.1 Shipment Creation Sequence Flow

```
Client (Shipper)         API Gateway         Shipment Service      ML Service
      │                       │                     │                    │
      │─── POST /shipments ──▶│                     │                    │
      │                       │──── JWT Valid? ────▶│                    │
      │                       │                     │                    │
      │                       │                     │─ POST /ml/precheck ▶│
      │                       │                     │                    │── Feature Compute
      │                       │                     │◀── risk_score: 18 ─│
      │                       │                     │                    │
      │                       │              Escrow Service     Crypto Service
      │                       │                     │                    │
      │                       │                     │── POST /escrow/init ▶│ (Escrow)
      │                       │                     │◀── escrow_id ───────│
      │                       │                     │── POST /merkle/leaf ─────────────▶│ (Crypto)
      │                       │                     │◀── leaf_hash ────────────────────│
      │                       │                     │                    │
      │                       │                     │── INSERT shipments (PostgreSQL)
      │                       │                     │── PUBLISH shipment.created (Kafka)
      │                       │                     │                    │
      │◀── 201 { shipment_id, ml_score, leaf_hash } ──────────────────────
      │                       │                     │                    │
      │                       │              [ASYNC via Kafka]           │
      │                       │                     │── ML Service consumes shipment.created
      │                       │                     │── Audit Service records event
```

---

## 3.2 ML Inference Sequence Flow

```
IoT Device           IoT Ingestion Service     Kafka            ML Service         Alert Service
    │                        │                   │                  │                    │
    │── POST /iot/ingest ───▶│                   │                  │                    │
    │                        │── HMAC Validate   │                  │                    │
    │                        │── INSERT TimescaleDB sensor_readings │                    │
    │                        │── PUBLISH sensor.ingested ──────────▶│                    │
    │◀── 202 Accepted ───────│                   │                  │                    │
    │                        │                   │                  │── Consume event    │
    │                        │                   │                  │── Query TimescaleDB│
    │                        │                   │                  │   (last 60 readings)
    │                        │                   │                  │── FeatureExtractor │
    │                        │                   │                  │── IsolationForest  │
    │                        │                   │                  │── LSTMAutoencoder  │
    │                        │                   │                  │── Composite Score  │
    │                        │                   │                  │── INSERT ml_results│
    │                        │                   │                  │── SET Redis cache  │
    │                        │                   │── PUBLISH ml.inference.completed ────▶│
    │                        │                   │                  │                    │── ThresholdEval
    │                        │                   │                  │                    │── If exceeded:
    │                        │                   │                  │                    │── INSERT alerts
    │                        │                   │                  │                    │── Push notify
    │                        │                   │                  │                    │── PUBLISH alert.created
```

---

## 3.3 Escrow Settlement Sequence Flow

```
Buyer Client        Escrow Service       Crypto Service (Rust)    Bitcoin Network
    │                    │                       │                       │
    │── GET /escrow/{id}/psbt ──────────────────▶│                       │
    │◀── base64 PSBT (unsigned) ─────────────────│                       │
    │                    │                       │                       │
    │ [Buyer signs offline with private key]     │                       │
    │                    │                       │                       │
    │── POST /escrow/{id}/psbt/sign ─────────────▶                       │
    │                    │── validate sig ───────▶│                       │
    │                    │── store partial sig ──▶│                       │
    │                    │                       │── Platform auto-signs  │
    │                    │                       │── 2-of-3 met          │
    │                    │                       │── finalize_psbt()     │
    │                    │                       │── broadcast_tx() ─────▶│
    │                    │                       │                       │── Confirm (1 block)
    │                    │                       │◀── txid + block_height─│
    │                    │                       │── INSERT bitcoin_commitments
    │                    │── UPDATE escrow status = funded/released       │
    │                    │── PUBLISH escrow.settled                       │
    │◀── 200 { status: funded, txid } ──────────────────────────────────
```

---

## 3.4 Merkle Commitment & Bitcoin Anchoring Sequence Flow

```
Tokio Scheduler    Crypto Service (Rust)         PostgreSQL        Bitcoin Core RPC
    │                     │                           │                    │
    │── timer fires ─────▶│                           │                    │
    │                     │── SELECT merkle_leaves WHERE committed=false──▶│
    │                     │◀── leaf_hashes ───────────────────────────────│
    │                     │                           │                    │
    │                     │── MerkleModule.build_tree()                    │
    │                     │   [SHA-256 → double hash pairs → root]         │
    │                     │── INSERT merkle_trees (root_hash, leaf_count) ▶│
    │                     │── UPDATE merkle_leaves (committed=true, proof_path) ▶│
    │                     │── PUBLISH merkle.committed                     │
    │                     │                           │                    │
    │                     │── BitcoinModule.build_op_return_tx(root_hash)  │
    │                     │── BitcoinModule.sign_tx() [Vault key]          │
    │                     │── sendrawtransaction ──────────────────────────▶│
    │                     │                           │                    │── Broadcast
    │                     │── Poll gettransaction every 30s ───────────────▶│
    │                     │◀── confirmations >= 1 ────────────────────────│
    │                     │── INSERT bitcoin_commitments (txid, block_height)▶│
    │                     │── PUBLISH bitcoin.anchored                     │
    │                     │── [Audit Service records event]                │
```

---

## 3.5 Alert Dispute Resolution Flow

```
Participant (Carrier/Farmer)    Alert Service          Audit Service        Escrow Service
          │                         │                       │                    │
          │── POST /alerts/{id}/dispute ─────────────────────▶
          │   { reason, evidence_s3_key }                   │                    │
          │                         │── INSERT dispute_tickets                   │
          │                         │── Assign auditor (round-robin pool)        │
          │                         │── PUBLISH alert.disputed                  │
          │◀── 201 { dispute_id, sla_deadline } ───────────│                    │
          │                         │                       │── Record dispute    │
          │                         │                       │                    │── HOLD escrow
          │                         │                       │                    │
          │                 [Auditor reviews via dashboard]  │                    │
          │                         │                       │                    │
          │                         │── Auditor: PATCH /alerts/{id}/dispute/resolve
          │                         │   { determination: uphold | overturn }     │
          │                         │                       │                    │
          │                         │── UPDATE alerts.status = resolved          │
          │                         │── If overturn: reset risk score             │
          │                         │── Notify participant                       │
          │                         │── PUBLISH alert.resolved                  │
          │                         │                       │── Record resolution │── Release or maintain
```

---

# SECTION 4: FINAL ARCHITECTURE SUMMARY

---

## System Summary

Origin is a production-grade, event-driven, cryptographically verifiable agricultural supply chain fraud detection and settlement platform. It combines real-time IoT telemetry ingestion, multi-model ML inference, Merkle-tree-based cryptographic commitments, Bitcoin public blockchain anchoring, and PSBT multisignature escrow settlement into a unified system. The platform serves nine distinct user types through role-differentiated dashboards and exposes all functionality via a versioned REST API backed by FastAPI microservices. The cryptographic layer is implemented in Rust for performance and correctness guarantees.

---

## Scalability Characteristics

The system is designed for horizontal scalability at every layer. Stateless FastAPI microservices scale via Kubernetes HPA. The ML Service scales based on Kafka consumer lag using KEDA. TimescaleDB hypertables with automatic time-based partitioning handle high-volume IoT telemetry ingestion (designed for millions of sensor readings per day). Redis cluster mode handles high cache throughput. Kafka scales via partition-level parallelism. The Rust Crypto Service is inherently high-performance: the Merkle tree construction for 10,000 leaves completes in under 50 milliseconds; Bitcoin RPC calls are the primary latency bottleneck and are handled asynchronously. The system meets the sub-2-second API latency target under normal load.

---

## Fault Tolerance

The platform is designed to tolerate individual service failures without data loss. Kafka acts as a durable event buffer — if the ML Service is down for minutes or hours, events accumulate in the Kafka topic with a 7-day retention window and are processed in order on recovery without data loss. PostgreSQL with a primary-replica setup tolerates single-node failure. The Crypto Service Merkle batch job uses PostgreSQL advisory locks for leader election, ensuring that a single node failure causes the next healthy replica to take over the next scheduled cycle without duplicate commitments. Bitcoin transaction retries with RBF fee bumping ensure that temporary network congestion or miner fee fluctuations do not result in permanently unanchored commitments. All financial escrow state is in PostgreSQL and on the Bitcoin blockchain simultaneously; the Bitcoin transaction is the authoritative settlement record.

---

## Security Properties

All data in transit is encrypted with TLS 1.3. All data at rest is encrypted at the disk level (AES-256). JWTs are signed with RS256 and have short (1-hour) access token lifetimes. PostgreSQL Row-Level Security enforces organization-level data isolation at the database layer independent of application-layer access controls. Bitcoin private keys are stored in HashiCorp Vault with full audit logging of all key accesses. Participant private keys for PSBT signing never leave the participant's device; only public keys and partial signatures are transmitted to the platform. KYC documents are encrypted with a separate KMS key and purged from storage after verification. All system actions are recorded in an append-only `audit_logs` table with no DELETE or UPDATE grants on the service account.

---

## Crypto Integrity Guarantees

Every supply chain event that enters the system produces a SHA-256 hash stored as a Merkle leaf. Every 10 minutes, all uncommitted leaves are assembled into a Merkle tree whose root hash is deterministically derived from all event hashes in that batch. This root hash is embedded in a Bitcoin OP_RETURN transaction and broadcast to the Bitcoin blockchain. Once confirmed (minimum 1 block, target 6 blocks for finality), the event data is permanently and publicly anchored. Any third party can independently verify any supply chain event by: (1) obtaining the event's SHA-256 leaf hash, (2) obtaining the Merkle proof path from the platform, (3) computing the root hash by traversing the proof path, and (4) verifying that this root hash matches an OP_RETURN output in a specific Bitcoin transaction at a specific block height. This provides tamper-evidence without requiring trust in any centralized authority. Custody events are additionally linked by a hash chain (each event records the SHA-256 hash of the previous event), providing a secondary tamper-detection layer independent of the Merkle commitment.

---

## ML Reliability Guarantees

The ML pipeline is designed for reliability and explainability rather than black-box performance. All inference results are stored with their full feature snapshot and model version, enabling post-hoc analysis of any decision. The ensemble approach (combining Isolation Forest for point anomalies with LSTM Autoencoder for temporal patterns) reduces both false positives and false negatives compared to single-model approaches. Configurable per-cargo-category thresholds allow operators to tune sensitivity. All alerts include the ML confidence percentage. A dispute workflow allows participants to contest ML decisions, with auditor review providing human-in-the-loop oversight. Model drift detection is implemented as a scheduled monitoring job that computes inference score distribution statistics over a rolling 7-day window and alerts operations if the distribution shifts beyond configured bounds, triggering a retraining cycle. The model versioning system allows rapid rollback to a previous model version if a newly deployed model shows degraded performance metrics.

---

*End of Origin Engineering Design Document — HLD + LLD*
*Version 1.0 | February 2026 | Jagadish Sunil Pednekar*

---

