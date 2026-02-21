# Origin — Data Flow Diagrams

**Agricultural Supply Chain Fraud Detection System**
**Author:** Jagadish Sunil Pednekar | **Version:** 1.0 | **February 2026**

---

## Table of Contents

1. [Level-0 DFD — System Context Diagram](#level-0-dfd--system-context-diagram)
2. [Level-1 DFD — Service Level](#level-1-dfd--service-level)
3. [Level-2 DFD — Shipment Creation Flow](#level-2-dfd--shipment-creation-flow)
4. [Event Flow Diagram — Kafka Async Architecture](#event-flow-diagram--kafka-async-architecture)
5. [Database Architecture Diagram](#database-architecture-diagram)
6. [Storage Architecture Diagram](#storage-architecture-diagram)
7. [Data Lifecycle Flow](#data-lifecycle-flow)

---

## Level-0 DFD — System Context Diagram

> Shows all external entities and their interaction with the Origin platform as a black box.

```mermaid
flowchart TD
    subgraph EXTERNAL["External Entities"]
        USERS["👤 Users\n(Shippers, Buyers, Carriers,\nAuditors, Regulators, Farmers)"]
        IOT["📡 IoT Devices\n(Temperature, Humidity,\nGPS, Tilt Sensors)"]
        BITCOIN["₿ Bitcoin Network\n(Testnet / Mainnet)"]
        EXTAPI["🔌 External APIs\n(SendGrid, FCM, APNs,\nOAuth Providers)"]
        MOBILE["📱 Mobile App\n(Flutter — iOS / Android)"]
        WEBAPP["🌐 Web App\n(Next.js / TypeScript)"]
    end

    subgraph ORIGIN["🏭 ORIGIN PLATFORM"]
        CORE["Origin Core System\n\nML Fraud Detection\nCryptographic Anchoring\nPSBT Escrow Settlement\nChain-of-Custody Ledger\nReal-time Alerts\nAudit Dashboards"]
    end

    USERS -->|"Login, Register, Submit Shipments,\nSign PSBTs, View Dashboards"| WEBAPP
    USERS -->|"Mobile Login, View Alerts,\nApprove Handoffs"| MOBILE
    WEBAPP -->|"REST API Calls (HTTPS/JWT)"| ORIGIN
    MOBILE -->|"REST API Calls (HTTPS/JWT)"| ORIGIN
    IOT -->|"Sensor Telemetry\n(HMAC-signed batches)"| ORIGIN
    ORIGIN -->|"OP_RETURN Merkle Root Commitment"| BITCOIN
    BITCOIN -->|"Transaction Confirmation\n(txid, block_height)"| ORIGIN
    ORIGIN -->|"Email Alerts, Push Notifications"| EXTAPI
    EXTAPI -->|"Delivery Status"| ORIGIN
    ORIGIN -->|"Risk Scores, Alerts, Proof Bundles"| USERS
    ORIGIN -->|"Device Auth, ACK"| IOT
```

---

## Level-1 DFD — Service Level

> Shows data flow from Client → API Gateway → Microservices → Databases → Kafka → ML → Crypto → Storage.

```mermaid
flowchart TD
    subgraph CLIENT["Client Layer"]
        WEB["Next.js Web App"]
        APP["Flutter Mobile App"]
        IOTDEV["IoT Device SDK"]
    end

    subgraph GATEWAY["API Gateway Layer"]
        GW["Nginx / Traefik\n(JWT Validation · Rate Limiting\nTLS Termination · Load Balancing)"]
    end

    subgraph SERVICES["Microservices Layer"]
        AUTH["Auth Service\n(FastAPI)"]
        USER["User Service\n(FastAPI)"]
        SHIP["Shipment Service\n(FastAPI)"]
        IOT["IoT Ingestion Service\n(FastAPI)"]
        ML["ML Service\n(FastAPI + PyTorch)"]
        ESCROW["Escrow Service\n(FastAPI + Rust)"]
        CRYPTO["Crypto Service\n(Rust)"]
        ALERT["Alert Service\n(FastAPI)"]
        AUDIT["Audit Service\n(FastAPI)"]
        REPORT["Reporting Service\n(FastAPI)"]
    end

    subgraph DATA["Data Layer"]
        PG[("PostgreSQL\n(Primary Relational DB)")]
        TS[("TimescaleDB\n(IoT Time-series)")]
        REDIS[("Redis\n(Cache + Rate Limiting)")]
        S3[("S3\n(Files, Models, Proofs)")]
    end

    subgraph KAFKA["Event Layer — Apache Kafka / Redpanda"]
        K_SHIP["shipment.created"]
        K_SENSOR["sensor.ingested"]
        K_ML["ml.inference.completed"]
        K_ALERT["alert.created"]
        K_MERKLE["merkle.committed"]
        K_BTC["bitcoin.anchored"]
        K_ESCROW["escrow.created / escrow.settled"]
        K_CUSTODY["custody.handoff"]
        K_KYC["kyc.submitted"]
    end

    subgraph CRYPTO_LAYER["Crypto Layer"]
        MERKLE["Merkle Service\n(Rust — SHA-256 Tree)"]
        BTC["Bitcoin Service\n(Rust + Bitcoin Core RPC)"]
        PSBT["PSBT Escrow Engine\n(Rust — BIP-174 2-of-3)"]
    end

    subgraph ML_LAYER["ML Layer"]
        FEAT["Feature Pipeline\n(Extractor, Normalizer)"]
        INFER["Inference Engine\n(Isolation Forest · LSTM AE\nGNN · Ensemble Classifier)"]
        REG["Model Registry\n(S3 Artifacts)"]
    end

    WEB -->|"HTTPS REST"| GW
    APP -->|"HTTPS REST"| GW
    IOTDEV -->|"HMAC-Signed POST"| GW

    GW --> AUTH
    GW --> USER
    GW --> SHIP
    GW --> IOT
    GW --> ML
    GW --> ESCROW
    GW --> ALERT
    GW --> REPORT

    AUTH -->|"R/W users, sessions, kyc_records"| PG
    AUTH -->|"Lockout counters"| REDIS
    AUTH --> K_KYC

    USER -->|"R/W user profiles, wallet_keys"| PG
    SHIP -->|"R/W shipments, custody_events,\nshipment_events, iot_devices"| PG
    SHIP -->|"Cache ml:score:{id}"| REDIS
    SHIP -->|"Upload manifest files"| S3
    SHIP --> K_SHIP
    SHIP --> K_CUSTODY

    IOT -->|"Bulk INSERT sensor_readings"| TS
    IOT -->|"Cache device records"| REDIS
    IOT --> K_SENSOR

    ML -->|"R/W ml_inference_results, model_versions"| PG
    ML -->|"Query sensor_readings (60-reading windows)"| TS
    ML -->|"Cache ml:features:{id}"| REDIS
    ML -->|"Load model artifacts"| S3
    ML --> K_ML

    ESCROW -->|"R/W escrow_agreements, psbt_transactions"| PG
    ESCROW --> K_ESCROW

    CRYPTO -->|"R/W merkle_trees, merkle_leaves,\nbitcoin_commitments, psbt_records"| PG
    CRYPTO --> K_MERKLE
    CRYPTO --> K_BTC

    ALERT -->|"R/W alerts"| PG
    ALERT --> K_ALERT

    AUDIT -->|"Append-only INSERT audit_logs"| PG

    REPORT -->|"Query all tables (read-only)"| PG
    REPORT -->|"Fetch proof artifacts"| S3

    K_SHIP -->|"Consume"| ML
    K_SHIP -->|"Consume"| CRYPTO
    K_SHIP -->|"Consume"| AUDIT
    K_SENSOR -->|"Consume"| ML
    K_ML -->|"Consume"| ALERT
    K_ML -->|"Update cache"| SHIP
    K_ALERT -->|"Consume"| ESCROW
    K_ESCROW -->|"Consume"| CRYPTO
    K_CUSTODY -->|"Consume"| ML
    K_CUSTODY -->|"Consume"| CRYPTO
    K_KYC -->|"Consume"| ML

    ML -->|"Orchestrate"| FEAT
    FEAT -->|"Features"| INFER
    INFER -->|"Load models"| REG
    REG -->|"Artifacts"| S3

    CRYPTO -->|"Build tree"| MERKLE
    MERKLE -->|"Root hash"| BTC
    CRYPTO -->|"Construct PSBT"| PSBT
```

---

## Level-2 DFD — Shipment Creation Flow

> Full synchronous and asynchronous flow for a single shipment submission, from user to Bitcoin.

```mermaid
flowchart TD
    subgraph SYNC["⚡ Synchronous Flow"]
        CLIENT["Client\n(Web / Mobile)"]
        GW["API Gateway\n(JWT Validate · Route)"]
        SS["Shipment Service\n(ShipmentService)"]
        MLP["ML Service\n(Pre-check HTTP)"]
        S3U["S3\n(Manifest Upload)"]
        PG1["PostgreSQL\n(INSERT shipments)"]
        DEV["IoT Device Registry\n(Bind devices)"]
        ESC["Escrow Service\n(Init escrow_agreements)"]
        CRYPT["Crypto Service\n(Compute merkle_leaf_hash)"]
    end

    subgraph ASYNC["🔄 Async Flow (Post-Publish)"]
        KAFKA["Kafka\nshipment.created"]
        ML_FULL["ML Service\n(Full Inference Pipeline)"]
        FEAT["Feature Extractor\n(TimescaleDB query)"]
        IF["Isolation Forest"]
        LSTM["LSTM Autoencoder"]
        GNN["GNN Risk Scorer"]
        ENS["Ensemble Classifier"]
        MLRES["PostgreSQL\n(INSERT ml_inference_results)"]
        ML_PUB["Kafka\nml.inference.completed"]
        ALTSVC["Alert Service\nMLResultConsumer"]
        PG_ALERT["PostgreSQL\n(INSERT alerts)"]
        K_ALERT["Kafka\nalert.created"]
        AUDSVC["Audit Service"]
        PG_AUDIT["PostgreSQL\n(INSERT audit_logs)"]
        CRYPTOSVC["Crypto Service\n(Merkle Batch — 10 min)"]
        MERKLE_PG["PostgreSQL\n(UPDATE merkle_leaves.committed)"]
        BTC["Bitcoin Service\n(OP_RETURN broadcast)"]
        BTC_PG["PostgreSQL\n(INSERT bitcoin_commitments)"]
        K_BTC["Kafka\nbitcoin.anchored"]
    end

    CLIENT -->|"POST /api/v1/shipments\n+ JWT + payload"| GW
    GW -->|"Route after JWT valid"| SS
    SS -->|"HTTP POST /api/v1/ml/risk/precheck\n(timeout: 5s)"| MLP
    MLP -->|"risk_score (0-100)"| SS
    SS -->|"boto3 upload manifest"| S3U
    S3U -->|"s3_key"| SS
    SS -->|"INSERT shipments record"| PG1
    SS -->|"Validate + bind device_ids"| DEV
    DEV -->|"OK"| SS
    SS -->|"POST /api/v1/escrow/init"| ESC
    ESC -->|"escrow_agreement_id"| SS
    SS -->|"POST /api/v1/crypto/merkle/leaf"| CRYPT
    CRYPT -->|"merkle_leaf_hash"| SS
    SS -->|"Publish shipment.created"| KAFKA
    SS -->|"201 {shipment_id, ml_precheck_score,\nmerkle_leaf_hash, escrow_agreement_id}"| CLIENT

    KAFKA -->|"Consume"| ML_FULL
    ML_FULL --> FEAT
    FEAT -->|"60 sensor readings\nfrom TimescaleDB"| FEAT
    FEAT -->|"Feature vectors"| IF
    FEAT -->|"Time-series (60, n_features)"| LSTM
    FEAT -->|"Graph node features"| GNN
    FEAT -->|"Engineered feature vector"| ENS
    IF -->|"anomaly score"| MLRES
    LSTM -->|"MSE reconstruction error"| MLRES
    GNN -->|"risk probability"| MLRES
    ENS -->|"provenance probability"| MLRES
    MLRES -->|"Publish"| ML_PUB
    ML_PUB -->|"Consume"| ALTSVC
    ALTSVC -->|"Threshold eval → INSERT alert"| PG_ALERT
    ALTSVC -->|"Publish"| K_ALERT
    K_ALERT -->|"Notify: email/push/WebSocket"| ALTSVC

    KAFKA -->|"Consume"| AUDSVC
    AUDSVC -->|"Append-only INSERT"| PG_AUDIT

    CRYPTOSVC -->|"Query uncommitted leaves every 10 min"| MERKLE_PG
    MERKLE_PG -->|"committed leaves"| CRYPTOSVC
    CRYPTOSVC -->|"Build tree → UPDATE committed=true"| MERKLE_PG
    CRYPTOSVC -->|"build_op_return_tx + broadcast"| BTC
    BTC -->|"Poll confirmations (30s interval)"| BTC
    BTC -->|"INSERT bitcoin_commitments"| BTC_PG
    BTC -->|"Publish"| K_BTC
```

---

## Event Flow Diagram — Kafka Async Architecture

> Complete Kafka topic map with all producers and consumers.

```mermaid
flowchart LR
    subgraph PRODUCERS["📤 Producers"]
        P_AUTH["Auth Service"]
        P_SHIP["Shipment Service"]
        P_IOT["IoT Ingestion Service"]
        P_ML["ML Service"]
        P_ALERT["Alert Service"]
        P_CRYPTO["Crypto Service"]
        P_ESCROW["Escrow Service"]
    end

    subgraph TOPICS["📨 Kafka Topics"]
        T1["shipment.created\n6 partitions · key=shipment_id"]
        T2["sensor.ingested\n12 partitions · key=device_id\nretention=1 day"]
        T3["custody.handoff\n6 partitions · key=shipment_id"]
        T4["kyc.submitted\n3 partitions · key=user_id"]
        T5["ml.inference.completed\n6 partitions · key=shipment_id"]
        T6["alert.created\n3 partitions · key=shipment_id"]
        T7["escrow.created\n3 partitions · key=escrow_id"]
        T8["escrow.settled\n3 partitions · key=escrow_id"]
        T9["merkle.committed\n1 partition · ordered"]
        T10["bitcoin.anchored\n1 partition · ordered"]
        DLQ["dlq.* topics\n(Dead Letter Queues)\nretention=30 days"]
    end

    subgraph CONSUMERS["📥 Consumers"]
        C_ML["ML Service\n(MLEventConsumer)"]
        C_CRYPTO["Crypto Service\n(EventConsumer)"]
        C_AUDIT["Audit Service"]
        C_ALERT["Alert Service\n(MLResultConsumer)"]
        C_ESCROW_A["Escrow Service\n(AlertConsumer)"]
        C_SHIP["Shipment Service\n(MLResultHandler,\nMerkleStatusHandler)"]
    end

    P_SHIP -->|"publish"| T1
    P_SHIP -->|"publish"| T3
    P_IOT -->|"publish"| T2
    P_AUTH -->|"publish"| T4
    P_ML -->|"publish"| T5
    P_ALERT -->|"publish"| T6
    P_ESCROW -->|"publish"| T7
    P_ESCROW -->|"publish"| T8
    P_CRYPTO -->|"publish"| T9
    P_CRYPTO -->|"publish"| T10

    T1 -->|"consume"| C_ML
    T1 -->|"consume"| C_CRYPTO
    T1 -->|"consume"| C_AUDIT
    T2 -->|"consume"| C_ML
    T3 -->|"consume"| C_ML
    T3 -->|"consume"| C_CRYPTO
    T4 -->|"consume"| C_ML
    T5 -->|"consume"| C_ALERT
    T5 -->|"Update Redis ml:score"| C_SHIP
    T6 -->|"Flag escrow for review"| C_ESCROW_A
    T7 -->|"consume"| C_CRYPTO
    T9 -->|"Mark bitcoin_committed=true"| C_SHIP

    C_ML -->|"on failure → retry 3x"| DLQ
    C_CRYPTO -->|"on failure → retry 3x"| DLQ
    C_ALERT -->|"on failure → retry 3x"| DLQ
```

---

## Database Architecture Diagram

> Shows which services write to which data stores.

```mermaid
flowchart TD
    subgraph PG["🐘 PostgreSQL — Primary Relational DB"]
        PG_T["users · organizations · sessions · kyc_records\nshipments · shipment_events · custody_events\niot_devices · alerts · escrow_agreements\npsbt_transactions · merkle_trees · merkle_leaves\nbitcoin_commitments · ml_inference_results\nmodel_versions · audit_logs · wallet_keys\nparticipant_risk_scores · alert_thresholds"]
    end

    subgraph TS["⏱️ TimescaleDB — IoT Time-series"]
        TS_T["sensor_readings (hypertable)\nPartitioned: 7-day chunks\nCompressed: chunks > 30 days\nContinuous Aggregates: 1h · 1d\n(temp mean, min, max)"]
    end

    subgraph REDIS["⚡ Redis — Cache & Rate Limiting"]
        R_T["ml:score:{shipment_id}\nml:features:{shipment_id}:{type}:{ts}\niot:device:{device_id}\nlockout:{email}\nsession:{token}\nratelimit:{ip}"]
    end

    subgraph S3["📦 S3 — File & Artifact Storage"]
        S3_T["shipment manifests\nKYC documents\nML model artifacts (.pkl, .pt)\nproof PDF bundles\naudit report archives"]
    end

    AUTH_S["Auth Service"] -->|"users, sessions, kyc_records, audit_logs"| PG
    AUTH_S -->|"lockout:email counters"| REDIS

    USER_S["User Service"] -->|"users, wallet_keys"| PG

    SHIP_S["Shipment Service"] -->|"shipments, shipment_events,\ncustody_events, iot_devices"| PG
    SHIP_S -->|"ml:score cache"| REDIS
    SHIP_S -->|"manifest files"| S3

    IOT_S["IoT Ingestion Service"] -->|"sensor_readings (bulk)"| TS
    IOT_S -->|"iot:device cache"| REDIS

    ML_S["ML Service"] -->|"ml_inference_results, model_versions"| PG
    ML_S -->|"sensor_readings (query)"| TS
    ML_S -->|"ml:features cache"| REDIS
    ML_S -->|"model artifacts (load)"| S3

    ESCROW_S["Escrow Service"] -->|"escrow_agreements, psbt_transactions"| PG

    CRYPTO_S["Crypto Service"] -->|"merkle_trees, merkle_leaves,\nbitcoin_commitments, psbt_records"| PG

    ALERT_S["Alert Service"] -->|"alerts, alert_thresholds"| PG

    AUDIT_S["Audit Service"] -->|"audit_logs (append-only)"| PG

    REPORT_S["Reporting Service"] -->|"All tables (read-only)"| PG
    REPORT_S -->|"proof bundles"| S3
```

---

## Storage Architecture Diagram

> Detailed storage role and data classification per store.

```mermaid
flowchart TD
    subgraph ORIGIN["Origin Platform Data Architecture"]

        subgraph HOT["Hot Path — Operational Data"]
            PG_BOX["🐘 PostgreSQL\n─────────────────\nRole: Primary relational store\nData: All normalized business entities\nKey tables: users, shipments,\nescrow_agreements, merkle_trees,\nbitcoin_commitments, audit_logs\nFeatures: JSONB columns, Row-Level Security,\nBRIN indexes for time-range, pgcrypto\nBackup: Daily WAL streaming replication\nScaling: Read replicas for reporting"]

            TS_BOX["⏱️ TimescaleDB\n─────────────────\nRole: IoT time-series store\nData: Raw sensor telemetry\nKey table: sensor_readings (hypertable)\nPartition: 7-day time chunks\nAggregates: 1h & 1d materialized views\nCompression: Chunks > 30 days\nIngestion: asyncpg COPY protocol\nRetention: 90 days raw · 1 year aggregated"]

            REDIS_BOX["⚡ Redis\n─────────────────\nRole: Low-latency cache & rate limit\nData: Hot reads & transient counters\nKey patterns:\n  ml:score:{shipment_id}\n  ml:features:{id}:{type}:{ts} TTL 30m\n  iot:device:{id} TTL 600s\n  lockout:{email} TTL dynamic\n  ratelimit:{ip}\nEviction: allkeys-lru\nPersistence: RDB snapshots (non-critical)"]
        end

        subgraph COLD["Cold Path — File & Model Storage"]
            S3_BOX["📦 S3 / Object Storage\n─────────────────\nRole: Immutable file & artifact store\nBuckets:\n  origin-manifests/ — shipment documents\n  origin-kyc/ — KYC identity documents\n  origin-models/ — ML model artifacts\n    (isolation_forest.pkl, lstm_ae.pt,\n    gnn.pt, ensemble.pkl)\n  origin-proofs/ — Cryptographic audit PDFs\n    (Merkle paths + Bitcoin txid + ML summary)\nAccess: Pre-signed URLs (15 min TTL)\nLifecycle: Intelligent tiering after 90 days"]
        end

        PG_BOX <-->|"Foreign key joins\nfor proof assembly"| TS_BOX
        PG_BOX <-->|"Cache invalidation\non writes"| REDIS_BOX
        PG_BOX <-->|"S3 key references\nin JSONB/varchar"| S3_BOX
        ML_MODEL["ML Service"] -->|"Load .pkl / .pt"| S3_BOX
        ML_MODEL -->|"Write inference results"| PG_BOX
    end
```

---

## Data Lifecycle Flow

> End-to-end numbered flow from shipment creation to Bitcoin anchoring and escrow settlement.

```
SHIPMENT CREATION
══════════════════════════════════════════════════════════
 1. Shipper submits POST /api/v1/shipments via Web/Mobile app
 2. API Gateway validates JWT (RS256), checks org_id role claim
 3. Shipment Service calls ML Service for pre-check risk score (HTTP, sync, 5s timeout)
 4. ML Service returns ml_precheck_score from ensemble classifier
 5. Shipment Service uploads manifest files to S3 → stores s3_key
 6. Shipment Service INSERTs shipments record into PostgreSQL (status=active)
 7. Shipment Service binds IoT device_ids to shipment in iot_devices table
 8. Shipment Service calls Escrow Service → INSERTs escrow_agreements (status=initialized)
 9. Shipment Service calls Crypto Service → computes SHA-256 merkle_leaf_hash
10. merkle_leaf_hash stored in PostgreSQL merkle_leaves (committed=false)
11. Shipment Service publishes shipment.created to Kafka (acks=all)
12. Shipment Service returns 201 to client: {shipment_id, ml_precheck_score, merkle_leaf_hash, escrow_agreement_id}

IOT SENSOR INGESTION
══════════════════════════════════════════════════════════
13. IoT device sends POST /api/v1/iot/ingest with HMAC-signed sensor batch
14. IoT Ingestion Service validates HMAC signature and device-to-shipment binding
15. Sensor readings bulk-inserted into TimescaleDB sensor_readings hypertable
16. IoT Ingestion Service publishes sensor.ingested to Kafka (keyed by device_id)

ML INFERENCE PIPELINE
══════════════════════════════════════════════════════════
17. ML Service consumes shipment.created, sensor.ingested, custody.handoff events
18. FeatureExtractor queries last 60 readings from TimescaleDB for the shipment
19. Features computed: cumulative_exposure, rate_of_temperature_change,
    route_deviation_score, handling_violation_score, provenance_consistency_score
20. Features cached in Redis: ml:features:{shipment_id}:{type}:{ts} (TTL: 30 min)
21. Isolation Forest runs anomaly detection on sensor feature vectors → score 0-100
22. LSTM Autoencoder reconstructs 60-reading sequence → MSE reconstruction error → score
23. GNN runs on heterogeneous supply chain graph → route deviation + participant risk
24. Ensemble Classifier (XGBoost + Random Forest) → provenance probability 0.0-1.0
25. Composite risk_score persisted to ml_inference_results in PostgreSQL
26. Risk score cached in Redis: ml:score:{shipment_id}
27. ML Service publishes ml.inference.completed to Kafka

ALERT GENERATION
══════════════════════════════════════════════════════════
28. Alert Service consumes ml.inference.completed
29. ThresholdEvaluator compares risk_score against alert_thresholds table
    WARNING threshold: 50 | CRITICAL threshold: 75
30. If threshold breached: INSERT alert into PostgreSQL alerts table
31. NotificationDispatcher sends: email (SendGrid/SES), push (FCM/APNs), WebSocket
32. Alert Service publishes alert.created to Kafka
33. If alert is CRITICAL: Escrow Service flags escrow_agreements.status = flagged_for_review

CUSTODY HANDOFF
══════════════════════════════════════════════════════════
34. Carrier submits custody handoff via POST /api/v1/shipments/{id}/custody
35. Shipment Service INSERTs custody_events with ECDSA signature + GPS coordinates
36. Event hash chained to previous_event_hash (tamper-evident chain)
37. custody.handoff published to Kafka → triggers ML re-inference on full route data

MERKLE TREE CONSTRUCTION
══════════════════════════════════════════════════════════
38. Crypto Service Rust scheduler runs every 10 minutes (Tokio interval)
39. Queries all merkle_leaves WHERE committed = false
40. If leaves exist: MerkleModule.build_tree() executes:
    a. Sort leaves by created_at (deterministic ordering)
    b. SHA-256 hash each leaf (double-hash per Merkle convention)
    c. Iteratively hash sibling pairs → single Merkle root
    d. If odd leaf count: duplicate last leaf
41. Merkle root and all intermediate nodes stored in merkle_trees table
42. Proof paths (sibling hash chains) stored in merkle_leaves.proof_path (JSONB)
43. All processed leaves marked committed=true with tree_id FK
44. merkle.committed published to Kafka
45. Shipment Service consumer marks relevant shipment_events as bitcoin_committed=true

BITCOIN ANCHORING
══════════════════════════════════════════════════════════
46. BitcoinModule.build_op_return_tx() constructs Bitcoin transaction:
    - Input: system wallet UTXO (fetched via bitcoincore-rpc)
    - Output 1: OP_RETURN <merkle_root_32_bytes> (zero-value data output)
    - Output 2: Change output to system wallet (minus miner fee)
    - Fee: estimatesmartfee RPC targeting 1-block confirmation
47. Transaction signed with system wallet private key (from Vault)
48. Transaction broadcast via sendrawtransaction RPC
49. Tokio background task polls gettransaction every 30 seconds until confirmations ≥ 1
50. On confirmation: INSERT bitcoin_commitments (txid, block_height, block_hash, confirmed_at)
51. bitcoin.anchored published to Kafka
52. RBF retry: If unconfirmed after 20 min → bump fee → re-broadcast (max 3 attempts)

PSBT ESCROW SETTLEMENT
══════════════════════════════════════════════════════════
53. Escrow Service receives escrow.created event → PSBTModule.create_multisig_psbt()
54. 2-of-3 P2WSH multisig PSBT constructed:
    - Keys: buyer_pubkey, seller_pubkey, platform_escrow_pubkey
    - Output: escrow_amount_satoshis locked to multisig address
55. Unsigned PSBT serialized to base64 → stored in psbt_transactions (status=pending)
56. Buyer calls POST /api/v1/escrow/{id}/psbt/sign with partial signature (signer_role=buyer)
57. Crypto Service validates partial signature using bitcoin crate PSBT primitives
58. Partial signature stored in psbt_transactions.signatures JSONB
59. Seller calls POST /api/v1/escrow/{id}/psbt/sign with partial signature (signer_role=seller)
60. 2-of-3 threshold reached → PSBTModule.finalize_psbt() produces fully signed transaction
61. Finalized TX broadcast via Bitcoin Core RPC
62. escrow_agreements.status = released | bitcoin_release_txid stored
63. escrow.settled published to Kafka
64. Audit Service inserts final settlement audit_log record

AUDIT & REPORTING
══════════════════════════════════════════════════════════
65. Audit Service consumes all Kafka events → append-only INSERT into audit_logs
66. audit_logs protected by PostgreSQL Row-Level Security (no UPDATE/DELETE for service roles)
67. Reporting Service generates proof PDF bundle on request:
    - Merkle proof path (leaf → root sibling hash chain)
    - Bitcoin txid + block_height + block_hash
    - ML inference summary (all model scores + feature snapshot)
    - Chain-of-custody event log with ECDSA signatures
68. Proof PDF uploaded to S3 origin-proofs/ and served via pre-signed URL (15 min TTL)
```

---

*Generated for Origin Agricultural Supply Chain Fraud Detection System — February 2026*
*All diagrams are implementation-ready for backend engineering teams.*
