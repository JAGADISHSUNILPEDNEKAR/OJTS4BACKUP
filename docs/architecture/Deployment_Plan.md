# Origin — Deployment Plan

**Agricultural Supply Chain Fraud Detection System**
**Author:** Jagadish Sunil Pednekar | **Version:** 1.0 | **February 2026**

---

## Table of Contents

1. [Environment Strategy](#1-environment-strategy)
2. [Deployment Architecture Overview](#2-deployment-architecture-overview)
3. [Network Architecture](#3-network-architecture)
4. [Service Deployment Plan](#4-service-deployment-plan)
5. [Database Deployment Plan](#5-database-deployment-plan)
6. [Kubernetes Deployment Specifications](#6-kubernetes-deployment-specifications)
7. [Environment Variables Specification](#7-environment-variables-specification)
8. [CI/CD Pipeline Plan](#8-cicd-pipeline-plan)
9. [Production Readiness Checklist](#9-production-readiness-checklist)

---

## 1. Environment Strategy

### 1.1 Environments

| Environment | Purpose | Cluster | Domain | Deploy Trigger |
|---|---|---|---|---|
| **dev** | Local development + feature branch testing | Docker Compose (local) | `localhost:8000` | `git push` to feature branch |
| **staging** | Integration testing + QA + stakeholder preview | Kubernetes (cloud) | `staging.origin.app` | Merge to `main` |
| **production** | Live system | Kubernetes (cloud, HA) | `app.origin.app` | Manual promote from staging after approval |

### 1.2 Environment Isolation Rules

- Staging uses **testnet** Bitcoin only. Production uses **mainnet** after explicit configuration.
- Each environment has **separate PostgreSQL clusters**, **separate Kafka clusters**, and **separate Redis instances** — no shared state between environments.
- Staging receives **real-shape anonymized data** from production for ML testing only via a one-way pipeline.
- Infrastructure-as-Code (Terraform) manages all environments identically — only environment-specific variable files differ.

---

## 2. Deployment Architecture Overview

### 2.1 Full Infrastructure Diagram

```mermaid
flowchart TD
    subgraph INTERNET["🌐 Internet / Public"]
        USERS["Users\n(Web + Mobile)"]
        IOT["IoT Devices"]
        BITCOIN_NET["₿ Bitcoin Network\n(Testnet / Mainnet)"]
    end

    subgraph EDGE["Edge / CDN Layer"]
        CDN["CloudFront / Cloudflare CDN\n(Static assets, Next.js)"]
        WAF["Web Application Firewall\n(AWS WAF / Cloudflare)"]
    end

    subgraph LB["Load Balancer Layer"]
        LB_EXT["External Load Balancer\n(AWS ALB / GCP GLB)\nTLS Termination"]
    end

    subgraph GW["API Gateway Layer (Kubernetes)"]
        NGINX["Nginx / Traefik Ingress Controller\nJWT Validation · Rate Limiting\nRouting · mTLS to services"]
    end

    subgraph K8S["Kubernetes Cluster (origin-prod)"]
        subgraph NS_APP["Namespace: origin-app"]
            AUTH["auth-service\n3 replicas"]
            USER["user-service\n2 replicas"]
            SHIP["shipment-service\n3 replicas"]
            IOT_SVC["iot-ingestion-service\n5 replicas"]
            ML["ml-service\n3 replicas"]
            ESCROW["escrow-service\n2 replicas"]
            ALERT["alert-service\n2 replicas"]
            AUDIT["audit-service\n2 replicas"]
            REPORT["reporting-service\n2 replicas"]
        end

        subgraph NS_CRYPTO["Namespace: origin-crypto"]
            CRYPTO["crypto-service (Rust)\n2 replicas"]
        end

        subgraph NS_WORKERS["Namespace: origin-workers"]
            CELERY["celery-worker\n3 replicas\n(PDF generation, ML retraining)"]
        end

        subgraph NS_INFRA["Namespace: origin-infra"]
            KEDA["KEDA Autoscaler"]
            PROM["Prometheus"]
            GRAFANA["Grafana"]
            VAULT["HashiCorp Vault"]
        end
    end

    subgraph DATA["Data Layer (Managed Services)"]
        PG["PostgreSQL 15\n(Primary + 2 Read Replicas)\nRDS / Cloud SQL"]
        TS["TimescaleDB\n(Primary + 1 Replica)\nSelf-hosted on K8s or TimescaleDB Cloud"]
        REDIS["Redis 7\n(Cluster Mode)\nElastiCache / Memorystore"]
        S3["S3 / GCS\n(origin-manifests, origin-kyc,\norigin-models, origin-proofs)"]
    end

    subgraph KAFKA["Event Layer"]
        KAFKA_C["Kafka / Redpanda Cluster\n3 Brokers · RF=3\nMSK / self-hosted"]
    end

    subgraph BITCOIN["Bitcoin Layer"]
        BTC_CORE["Bitcoin Core Node\n(testnet + mainnet)\nSelf-hosted on dedicated VM"]
    end

    USERS -->|"HTTPS"| CDN
    CDN --> WAF
    WAF --> LB_EXT
    IOT -->|"HTTPS + HMAC"| LB_EXT
    LB_EXT --> NGINX
    NGINX -->|"mTLS + JWT routing"| AUTH
    NGINX --> USER
    NGINX --> SHIP
    NGINX --> IOT_SVC
    NGINX --> ML
    NGINX --> ESCROW
    NGINX --> ALERT
    NGINX --> AUDIT
    NGINX --> REPORT

    AUTH --> PG
    USER --> PG
    SHIP --> PG
    SHIP --> REDIS
    IOT_SVC --> TS
    IOT_SVC --> REDIS
    ML --> PG
    ML --> TS
    ML --> REDIS
    ML --> S3
    ESCROW --> PG
    ALERT --> PG
    AUDIT --> PG
    REPORT --> PG
    REPORT --> S3

    CRYPTO --> PG
    CRYPTO -->|"Bitcoin Core RPC"| BTC_CORE
    BTC_CORE <-->|"OP_RETURN TX"| BITCOIN_NET

    SHIP --> KAFKA_C
    IOT_SVC --> KAFKA_C
    ML --> KAFKA_C
    ALERT --> KAFKA_C
    ESCROW --> KAFKA_C
    CRYPTO --> KAFKA_C
    AUTH --> KAFKA_C

    KAFKA_C --> ML
    KAFKA_C --> CRYPTO
    KAFKA_C --> ALERT
    KAFKA_C --> AUDIT
    KAFKA_C --> ESCROW
    KAFKA_C --> SHIP

    VAULT -->|"Secrets injection"| AUTH
    VAULT --> CRYPTO
    VAULT --> ML
    KEDA -->|"Scale on Kafka lag"| ML
    KEDA -->|"Scale on queue depth"| IOT_SVC
```

---

## 3. Network Architecture

### 3.1 Security Zones and Network Topology

```mermaid
flowchart TD
    subgraph PUBLIC_ZONE["🟢 Public Zone (Internet-facing)"]
        PZ1["CDN / WAF"]
        PZ2["External Load Balancer (ALB)"]
        PZ3["Nginx Ingress Controller\n(Kubernetes — public subnet)"]
    end

    subgraph DMZ["🟡 DMZ — API Gateway Zone"]
        DMZ1["API Gateway Pods\n(Traefik / Nginx)\nPublic subnet → Private subnet bridge"]
    end

    subgraph PRIVATE_APP["🔵 Private App Zone (K8s — private subnet)"]
        APP1["origin-app namespace\nAll FastAPI microservices\nPort 8000 internal only"]
        APP2["origin-crypto namespace\nRust Crypto Service\nPort 9000 internal only"]
        APP3["origin-workers namespace\nCelery workers\nNo inbound"]
    end

    subgraph PRIVATE_DATA["🔴 Private Data Zone (VPC — data subnet)"]
        DATA1["PostgreSQL 15 (Port 5432)\nPrivate subnet · No public IP"]
        DATA2["TimescaleDB (Port 5432)\nPrivate subnet · No public IP"]
        DATA3["Redis Cluster (Port 6379)\nPrivate subnet · No public IP"]
        DATA4["Kafka Cluster (Port 9092 internal)\nPrivate subnet · SASL_SSL"]
    end

    subgraph CRYPTO_ZONE["🟣 Crypto Zone (Isolated VM)"]
        CZ1["Bitcoin Core Node\nDedicated VM · Port 8332 (RPC, internal-only)\nPort 8333 (P2P — Bitcoin network only)"]
        CZ2["HashiCorp Vault\nPort 8200 · Internal only\nAudit logging enabled"]
    end

    subgraph STORAGE_ZONE["⚫ Storage Zone (Cloud Managed)"]
        SZ1["S3 / GCS Buckets\nVPC Endpoint (no public internet traversal)\nEncrypted at rest (AES-256)"]
    end

    PUBLIC_ZONE --> DMZ
    DMZ -->|"mTLS between gateway and services"| PRIVATE_APP
    PRIVATE_APP -->|"Internal K8s DNS\nmTLS between services"| PRIVATE_APP
    PRIVATE_APP -->|"VPC peering / private endpoint"| PRIVATE_DATA
    PRIVATE_APP -->|"Internal DNS"| CRYPTO_ZONE
    APP2 -->|"Bitcoin Core RPC\n(127.0.0.1 / private IP)"| CZ1
    PRIVATE_APP -->|"VPC endpoint"| STORAGE_ZONE
    CZ2 -->|"Vault Agent sidecar"| PRIVATE_APP
```

### 3.2 Port and Service Exposure Summary

| Service | Internal Port | Exposed Publicly | Protocol |
|---|---|---|---|
| Nginx Ingress | 80/443 | ✅ Yes | HTTPS |
| auth-service | 8000 | ❌ No (via Gateway) | HTTP/mTLS internal |
| shipment-service | 8000 | ❌ No | HTTP/mTLS internal |
| ml-service | 8000 | ❌ No | HTTP/mTLS internal |
| crypto-service | 9000 | ❌ No | HTTP/mTLS internal |
| iot-ingestion-service | 8000 | ❌ No (via Gateway) | HTTP/mTLS internal |
| PostgreSQL | 5432 | ❌ No | TCP internal |
| TimescaleDB | 5432 | ❌ No | TCP internal |
| Redis | 6379 | ❌ No | TCP internal |
| Kafka | 9092 | ❌ No | SASL_SSL internal |
| Bitcoin Core RPC | 8332 | ❌ No | HTTP/RPC internal |
| Bitcoin Core P2P | 8333 | ✅ Yes (Bitcoin network only) | TCP |
| HashiCorp Vault | 8200 | ❌ No | HTTPS internal |
| Prometheus | 9090 | ❌ No | HTTP internal |
| Grafana | 3000 | ❌ No (VPN access only) | HTTP |

---

## 4. Service Deployment Plan

### 4.1 Per-Service Resource Allocation

| Service | Image | CPU Request | CPU Limit | Memory Request | Memory Limit | Min Replicas | Max Replicas | Autoscale Trigger |
|---|---|---|---|---|---|---|---|---|
| auth-service | `origin/auth-service:latest` | 250m | 500m | 256Mi | 512Mi | 2 | 8 | CPU > 70% |
| user-service | `origin/user-service:latest` | 250m | 500m | 256Mi | 512Mi | 2 | 6 | CPU > 70% |
| shipment-service | `origin/shipment-service:latest` | 500m | 1000m | 512Mi | 1Gi | 3 | 10 | CPU > 70% |
| iot-ingestion-service | `origin/iot-ingestion:latest` | 500m | 1000m | 512Mi | 1Gi | 5 | 20 | CPU > 60%, Kafka lag > 1000 |
| ml-service | `origin/ml-service:latest` | 1000m | 2000m | 2Gi | 4Gi | 2 | 8 | Kafka `sensor.ingested` lag > 500 (KEDA) |
| escrow-service | `origin/escrow-service:latest` | 250m | 500m | 256Mi | 512Mi | 2 | 6 | CPU > 70% |
| crypto-service | `origin/crypto-service:latest` | 500m | 1000m | 512Mi | 1Gi | 2 | 4 | CPU > 60% |
| alert-service | `origin/alert-service:latest` | 250m | 500m | 256Mi | 512Mi | 2 | 6 | Kafka `ml.inference.completed` lag > 200 |
| audit-service | `origin/audit-service:latest` | 250m | 500m | 256Mi | 512Mi | 2 | 4 | CPU > 70% |
| reporting-service | `origin/reporting-service:latest` | 500m | 1000m | 512Mi | 1Gi | 2 | 4 | CPU > 70% |
| celery-worker | `origin/celery-worker:latest` | 500m | 1000m | 1Gi | 2Gi | 3 | 10 | Redis queue depth > 50 |

### 4.2 Startup / Readiness / Liveness Probes

**Standard FastAPI services:**
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 15
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 3
```

**ML Service** (additional model-load delay):
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 60
  periodSeconds: 10
  failureThreshold: 5
```
> ML Service readiness probe only returns `200` after all models are loaded from S3 into memory.

**Crypto Service (Rust):**
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 9000
  initialDelaySeconds: 10
  periodSeconds: 10
```

---

## 5. Database Deployment Plan

### 5.1 PostgreSQL 15

| Parameter | Value |
|---|---|
| **Instance Type** | RDS `db.r6g.2xlarge` (8 vCPU, 64GB RAM) / GCP `db-custom-8-65536` |
| **Storage** | 500GB SSD gp3, autoscaling to 2TB |
| **Replication** | 1 Primary + 2 Read Replicas (same region); async WAL streaming |
| **Connection Pooling** | PgBouncer (deployed in K8s) — pool_mode=transaction, max_client_conn=1000 |
| **Max Connections** | 200 (direct); 1000 via PgBouncer |
| **Backup Strategy** | Automated daily snapshots (30-day retention); continuous WAL archiving to S3; Point-in-time recovery (PITR) up to 35 days |
| **Failover** | Automatic failover to standby replica (RDS Multi-AZ) — RTO < 60s |
| **Encryption** | AES-256 at rest; TLS 1.3 in transit |
| **Extensions** | `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `pg_trgm` |
| **Security** | Row-Level Security (RLS) enabled; `audit_writer` role has INSERT-only on `audit_logs`; all service roles restricted to owned tables only |
| **Monitoring** | Enhanced RDS monitoring + CloudWatch (or Cloud SQL Insights) — slow query log threshold: 100ms |

**Database initialization migrations (ordered):**
```
001_create_organizations.sql
002_create_users.sql
003_create_sessions_kyc.sql
004_create_wallet_keys.sql
005_create_shipments.sql
006_create_shipment_events.sql
007_create_custody_events.sql
008_create_iot_devices.sql
009_create_alerts.sql
010_create_alert_thresholds.sql
011_create_escrow_agreements.sql
012_create_psbt_transactions.sql
013_create_merkle_tables.sql
014_create_bitcoin_commitments.sql
015_create_ml_tables.sql
016_create_audit_logs.sql
017_create_participant_risk_scores.sql
018_create_indexes.sql
019_enable_rls_policies.sql
020_seed_alert_thresholds.sql
```

---

### 5.2 TimescaleDB

| Parameter | Value |
|---|---|
| **Instance Type** | TimescaleDB Cloud (Standard-8) or self-hosted `m5.2xlarge` |
| **Storage** | 1TB NVMe SSD (high IOPS for bulk inserts) |
| **Replication** | Primary + 1 async streaming replica |
| **Backup** | Daily base backup + WAL archiving to S3 |
| **Hypertable Config** | `sensor_readings`: chunk_time_interval = `7 days` |
| **Compression** | `timescaledb.compress = on` for chunks older than 30 days; `compress_orderby = timestamp`, `compress_segmentby = device_id` |
| **Continuous Aggregates** | `sensor_readings_hourly` (1h bucket: temp mean/min/max); `sensor_readings_daily` (1d bucket) |
| **Retention** | Raw: 90 days (`add_retention_policy`); Hourly aggregates: 1 year; Daily aggregates: 5 years |
| **Ingestion** | asyncpg COPY protocol from IoT Ingestion Service; PgBouncer pool in front |
| **Encryption** | AES-256 at rest; TLS in transit |

---

### 5.3 Redis 7 (Cluster Mode)

| Parameter | Value |
|---|---|
| **Mode** | Cluster mode (3 primary shards + 3 replicas) |
| **Instance Type** | ElastiCache `cache.r7g.large` per node / GCP Memorystore |
| **Total Memory** | 18GB (3 × 6GB) |
| **Eviction Policy** | `allkeys-lru` |
| **Persistence** | RDB snapshots every 1 hour (non-critical cache — no AOF required) |
| **Encryption** | TLS in transit; at-rest encryption enabled |
| **Backup** | Daily RDB snapshot retained 7 days |
| **Failover** | Automatic replica promotion (< 30s) |
| **Key Namespaces** | `ml:score:*` · `ml:features:*` · `iot:device:*` · `lockout:*` · `session:*` · `alert:thresholds:*` · `shipments:list:*` · `ratelimit:*` |

---

### 5.4 Kafka / Redpanda

| Parameter | Value |
|---|---|
| **Deployment** | AWS MSK (managed) or self-hosted Redpanda on 3 `m5.2xlarge` nodes |
| **Brokers** | 3 brokers (RF=3) |
| **Replication** | `replication.factor=3`, `min.insync.replicas=2` |
| **Retention** | Business topics: 7 days; `sensor.ingested`: 1 day; DLQ topics: 30 days |
| **Encryption** | SASL_SSL (SCRAM-SHA-512 authentication) |
| **Partitions** | Per-topic (see API Contracts Section 13) |
| **Schema Registry** | Confluent Schema Registry or Redpanda Schema Registry — JSON Schema enforced per topic |
| **Monitoring** | Kafka JMX metrics → Prometheus exporter; alert on: consumer lag > 5000, ISR < 2, disk > 80% |
| **Backup** | Kafka topic data is NOT a primary backup target — PostgreSQL is SoT. DLQ replay is the recovery path. |

---

### 5.5 S3 / Object Storage

| Bucket | Purpose | Access | Encryption | Lifecycle |
|---|---|---|---|---|
| `origin-manifests` | Shipment manifest PDFs | Pre-signed URLs (15 min) | SSE-S3 (AES-256) | Move to Glacier after 1 year |
| `origin-kyc` | KYC identity documents | Pre-signed URLs (15 min) | SSE-KMS | Move to Glacier after 90 days; delete after 7 years |
| `origin-models` | ML model artifacts (.pkl, .pt) | K8s IAM role (read) | SSE-S3 | Keep all versions (model registry) |
| `origin-proofs` | Cryptographic audit PDFs | Pre-signed URLs (15 min) | SSE-S3 | Move to Glacier after 2 years |

**All buckets:** Private ACL, no public access, VPC endpoint only, versioning enabled, access logging to `origin-access-logs`.

---

### 5.6 Bitcoin Core Node

| Parameter | Value |
|---|---|
| **Deployment** | Dedicated VM — `m5.xlarge` (4 vCPU, 16GB RAM) |
| **Storage** | 1TB SSD (testnet: ~100GB; mainnet: ~600GB+) |
| **Networks** | Testnet (staging); Mainnet (production) |
| **RPC Access** | `127.0.0.1:8332` only — no external RPC exposure |
| **Authentication** | Cookie-based RPC auth; credentials in Vault |
| **Wallet** | Encrypted wallet stored on encrypted volume; private key in Vault HSM |
| **Backup** | Encrypted `wallet.dat` backup to S3 daily; UTXO set synced |
| **Monitoring** | Custom exporter: block height, mempool size, wallet balance, peer count |

---

## 6. Kubernetes Deployment Specifications

### 6.1 Shipment Service

```yaml
# ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: shipment-service-config
  namespace: origin-app
data:
  APP_ENV: "production"
  LOG_LEVEL: "INFO"
  KAFKA_TOPIC_SHIPMENT_CREATED: "shipment.created"
  KAFKA_TOPIC_CUSTODY_HANDOFF: "custody.handoff"
  ML_SERVICE_URL: "http://ml-service.origin-app.svc.cluster.local:8000"
  ESCROW_SERVICE_URL: "http://escrow-service.origin-app.svc.cluster.local:8000"
  CRYPTO_SERVICE_URL: "http://crypto-service.origin-crypto.svc.cluster.local:9000"
  S3_MANIFESTS_BUCKET: "origin-manifests"
  REDIS_ML_SCORE_TTL: "300"
  POSTGRES_POOL_SIZE: "20"
  POSTGRES_MAX_OVERFLOW: "10"
---
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shipment-service
  namespace: origin-app
  labels:
    app: shipment-service
    version: "1.0.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shipment-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: shipment-service
        version: "1.0.0"
    spec:
      serviceAccountName: shipment-service-sa
      containers:
        - name: shipment-service
          image: origin/shipment-service:1.0.0
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          envFrom:
            - configMapRef:
                name: shipment-service-config
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: origin-db-secrets
                  key: shipment_service_db_url
            - name: KAFKA_BROKERS
              valueFrom:
                secretKeyRef:
                  name: origin-kafka-secrets
                  key: brokers
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: origin-redis-secrets
                  key: url
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: origin-s3-secrets
                  key: access_key_id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: origin-s3-secrets
                  key: secret_access_key
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 15
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8000
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 3
          volumeMounts:
            - name: tls-certs
              mountPath: /etc/tls
              readOnly: true
      volumes:
        - name: tls-certs
          secret:
            secretName: origin-internal-tls
---
# Service
apiVersion: v1
kind: Service
metadata:
  name: shipment-service
  namespace: origin-app
spec:
  selector:
    app: shipment-service
  ports:
    - port: 8000
      targetPort: 8000
      protocol: TCP
  type: ClusterIP
---
# HorizontalPodAutoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: shipment-service-hpa
  namespace: origin-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: shipment-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

### 6.2 ML Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-service
  namespace: origin-app
  labels:
    app: ml-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: ml-service
    spec:
      serviceAccountName: ml-service-sa
      initContainers:
        - name: model-loader
          image: origin/ml-service:1.0.0
          command: ["python", "-m", "app.model_loader"]
          volumeMounts:
            - name: model-cache
              mountPath: /app/models
          env:
            - name: S3_MODELS_BUCKET
              value: "origin-models"
      containers:
        - name: ml-service
          image: origin/ml-service:1.0.0
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: "1000m"
              memory: "2Gi"
            limits:
              cpu: "2000m"
              memory: "4Gi"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: origin-db-secrets
                  key: ml_service_db_url
            - name: TIMESCALEDB_URL
              valueFrom:
                secretKeyRef:
                  name: origin-db-secrets
                  key: timescaledb_url
            - name: KAFKA_BROKERS
              valueFrom:
                secretKeyRef:
                  name: origin-kafka-secrets
                  key: brokers
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: origin-redis-secrets
                  key: url
            - name: S3_MODELS_BUCKET
              value: "origin-models"
            - name: MODEL_RELOAD_INTERVAL_SECONDS
              value: "300"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8000
            initialDelaySeconds: 60
            periodSeconds: 10
            failureThreshold: 5
          volumeMounts:
            - name: model-cache
              mountPath: /app/models
      volumes:
        - name: model-cache
          emptyDir:
            medium: Memory
            sizeLimit: 3Gi
---
# KEDA ScaledObject for ML Service (Kafka lag-based autoscaling)
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: ml-service-keda
  namespace: origin-app
spec:
  scaleTargetRef:
    name: ml-service
  minReplicaCount: 2
  maxReplicaCount: 8
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka.origin-infra.svc.cluster.local:9092
        consumerGroup: ml-service-consumer-group
        topic: sensor.ingested
        lagThreshold: "500"
```

---

### 6.3 Crypto Service (Rust)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crypto-service
  namespace: origin-crypto
  labels:
    app: crypto-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: crypto-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: crypto-service
    spec:
      serviceAccountName: crypto-service-sa
      containers:
        - name: crypto-service
          image: origin/crypto-service:1.0.0
          ports:
            - containerPort: 9000
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: origin-crypto-secrets
                  key: database_url
            - name: KAFKA_BROKERS
              valueFrom:
                secretKeyRef:
                  name: origin-kafka-secrets
                  key: brokers
            - name: BITCOIN_RPC_URL
              valueFrom:
                secretKeyRef:
                  name: origin-btc-secrets
                  key: rpc_url
            - name: BITCOIN_RPC_USER
              valueFrom:
                secretKeyRef:
                  name: origin-btc-secrets
                  key: rpc_user
            - name: BITCOIN_RPC_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: origin-btc-secrets
                  key: rpc_password
            - name: BITCOIN_NETWORK
              value: "testnet"
            - name: VAULT_ADDR
              value: "http://vault.origin-infra.svc.cluster.local:8200"
            - name: VAULT_ROLE
              value: "crypto-service"
            - name: MERKLE_BATCH_INTERVAL_SECONDS
              value: "600"
          readinessProbe:
            httpGet:
              path: /health
              port: 9000
            initialDelaySeconds: 10
            periodSeconds: 10
          volumeMounts:
            - name: vault-token
              mountPath: /var/run/secrets/vault
            - name: tls-certs
              mountPath: /etc/tls
              readOnly: true
      volumes:
        - name: vault-token
          projected:
            sources:
              - serviceAccountToken:
                  path: token
                  expirationSeconds: 7200
                  audience: vault
        - name: tls-certs
          secret:
            secretName: origin-internal-tls
```

---

### 6.4 IoT Ingestion Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iot-ingestion-service
  namespace: origin-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: iot-ingestion-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  template:
    metadata:
      labels:
        app: iot-ingestion-service
    spec:
      containers:
        - name: iot-ingestion-service
          image: origin/iot-ingestion:1.0.0
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          env:
            - name: TIMESCALEDB_URL
              valueFrom:
                secretKeyRef:
                  name: origin-db-secrets
                  key: timescaledb_url
            - name: POSTGRES_URL
              valueFrom:
                secretKeyRef:
                  name: origin-db-secrets
                  key: iot_service_db_url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: origin-redis-secrets
                  key: url
            - name: KAFKA_BROKERS
              valueFrom:
                secretKeyRef:
                  name: origin-kafka-secrets
                  key: brokers
            - name: DEVICE_CACHE_TTL
              value: "600"
---
# KEDA for IoT Service
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: iot-ingestion-keda
  namespace: origin-app
spec:
  scaleTargetRef:
    name: iot-ingestion-service
  minReplicaCount: 5
  maxReplicaCount: 20
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka.origin-infra.svc.cluster.local:9092
        consumerGroup: iot-ingestion-consumer-group
        topic: sensor.ingested
        lagThreshold: "1000"
    - type: cpu
      metricType: Utilization
      metadata:
        value: "60"
```

---

### 6.5 Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: origin-ingress
  namespace: origin-app
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rate-limit: "300"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "30"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.origin.app
        - api.origin.app
      secretName: origin-tls-cert
  rules:
    - host: api.origin.app
      http:
        paths:
          - path: /api/v1/auth
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 8000
          - path: /api/v1/shipments
            pathType: Prefix
            backend:
              service:
                name: shipment-service
                port:
                  number: 8000
          - path: /api/v1/iot
            pathType: Prefix
            backend:
              service:
                name: iot-ingestion-service
                port:
                  number: 8000
          - path: /api/v1/ml
            pathType: Prefix
            backend:
              service:
                name: ml-service
                port:
                  number: 8000
          - path: /api/v1/escrow
            pathType: Prefix
            backend:
              service:
                name: escrow-service
                port:
                  number: 8000
          - path: /api/v1/alerts
            pathType: Prefix
            backend:
              service:
                name: alert-service
                port:
                  number: 8000
          - path: /api/v1/audit
            pathType: Prefix
            backend:
              service:
                name: audit-service
                port:
                  number: 8000
          - path: /api/v1/crypto
            pathType: Prefix
            backend:
              service:
                name: crypto-service
                port:
                  number: 9000
          - path: /api/v1/reports
            pathType: Prefix
            backend:
              service:
                name: reporting-service
                port:
                  number: 8000
          - path: /api/v1/users
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 8000
```

---

### 6.6 Secrets Structure

```yaml
# DB Secrets (managed by HashiCorp Vault Agent or AWS Secrets Manager)
apiVersion: v1
kind: Secret
metadata:
  name: origin-db-secrets
  namespace: origin-app
type: Opaque
# Keys (base64-encoded values injected by Vault Agent):
# auth_service_db_url
# shipment_service_db_url
# ml_service_db_url
# iot_service_db_url
# escrow_service_db_url
# timescaledb_url
---
apiVersion: v1
kind: Secret
metadata:
  name: origin-kafka-secrets
  namespace: origin-app
type: Opaque
# Keys:
# brokers  (e.g., kafka-0:9092,kafka-1:9092,kafka-2:9092)
# sasl_username
# sasl_password
---
apiVersion: v1
kind: Secret
metadata:
  name: origin-redis-secrets
  namespace: origin-app
type: Opaque
# Keys:
# url  (e.g., rediss://user:pass@redis-cluster:6379)
---
apiVersion: v1
kind: Secret
metadata:
  name: origin-btc-secrets
  namespace: origin-crypto
type: Opaque
# Keys:
# rpc_url
# rpc_user
# rpc_password
# wallet_name
---
apiVersion: v1
kind: Secret
metadata:
  name: origin-jwt-secrets
  namespace: origin-app
type: Opaque
# Keys:
# jwt_private_key_pem  (RS256 private key — from Vault)
# jwt_public_key_pem   (RS256 public key)
---
apiVersion: v1
kind: Secret
metadata:
  name: origin-s3-secrets
  namespace: origin-app
type: Opaque
# Keys:
# access_key_id
# secret_access_key
# region
---
# Internal mTLS certificates (auto-rotated by cert-manager)
apiVersion: v1
kind: Secret
metadata:
  name: origin-internal-tls
  namespace: origin-app
type: kubernetes.io/tls
# Keys:
# tls.crt
# tls.key
# ca.crt
```

---

## 7. Environment Variables Specification

### 7.1 Auth Service

```env
# App
APP_ENV=production
APP_PORT=8000
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql+asyncpg://auth_svc:password@pgbouncer:5432/origin_db
POSTGRES_POOL_SIZE=20
POSTGRES_MAX_OVERFLOW=10

# JWT (RS256 keys loaded from Vault)
JWT_PRIVATE_KEY_PATH=/etc/jwt/private_key.pem
JWT_PUBLIC_KEY_PATH=/etc/jwt/public_key.pem
JWT_ACCESS_TOKEN_EXPIRE_SECONDS=3600
JWT_REFRESH_TOKEN_EXPIRE_SECONDS=2592000

# Redis
REDIS_URL=rediss://redis-cluster:6379/0
REDIS_LOCKOUT_TTL_SECONDS=900
REDIS_OTP_REPLAY_TTL_SECONDS=90

# Kafka
KAFKA_BROKERS=kafka-0:9092,kafka-1:9092,kafka-2:9092
KAFKA_SASL_USERNAME=origin_auth
KAFKA_SASL_PASSWORD=<from_vault>
KAFKA_TOPIC_KYC_SUBMITTED=kyc.submitted

# Email
SENDGRID_API_KEY=<from_vault>
EMAIL_FROM=noreply@origin.app

# SSO
AZURE_AD_CLIENT_ID=<from_vault>
AZURE_AD_CLIENT_SECRET=<from_vault>
AZURE_AD_TENANT_ID=<from_vault>
GOOGLE_CLIENT_ID=<from_vault>
GOOGLE_CLIENT_SECRET=<from_vault>

# 2FA
TOTP_ISSUER_NAME=Origin

# Vault
VAULT_ADDR=http://vault.origin-infra.svc.cluster.local:8200
VAULT_ROLE=auth-service
```

---

### 7.2 Shipment Service

```env
APP_ENV=production
APP_PORT=8000
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql+asyncpg://ship_svc:password@pgbouncer:5432/origin_db
POSTGRES_POOL_SIZE=20

# Redis
REDIS_URL=rediss://redis-cluster:6379/0
ML_SCORE_CACHE_TTL_SECONDS=300
SHIPMENTS_LIST_CACHE_TTL_SECONDS=60

# Kafka
KAFKA_BROKERS=kafka-0:9092,kafka-1:9092,kafka-2:9092
KAFKA_SASL_USERNAME=origin_shipment
KAFKA_SASL_PASSWORD=<from_vault>
KAFKA_TOPIC_SHIPMENT_CREATED=shipment.created
KAFKA_TOPIC_CUSTODY_HANDOFF=custody.handoff

# Internal service URLs (mTLS)
ML_SERVICE_URL=https://ml-service.origin-app.svc.cluster.local:8000
ESCROW_SERVICE_URL=https://escrow-service.origin-app.svc.cluster.local:8000
CRYPTO_SERVICE_URL=https://crypto-service.origin-crypto.svc.cluster.local:9000
ML_PRECHECK_TIMEOUT_SECONDS=5

# S3
AWS_ACCESS_KEY_ID=<from_vault>
AWS_SECRET_ACCESS_KEY=<from_vault>
AWS_REGION=ap-south-1
S3_MANIFESTS_BUCKET=origin-manifests

# mTLS
TLS_CERT_PATH=/etc/tls/tls.crt
TLS_KEY_PATH=/etc/tls/tls.key
TLS_CA_PATH=/etc/tls/ca.crt
```

---

### 7.3 ML Service

```env
APP_ENV=production
APP_PORT=8000
LOG_LEVEL=INFO

# Databases
DATABASE_URL=postgresql+asyncpg://ml_svc:password@pgbouncer:5432/origin_db
TIMESCALEDB_URL=postgresql+asyncpg://ml_svc:password@timescaledb:5432/origin_ts

# Redis
REDIS_URL=rediss://redis-cluster:6379/0
FEATURE_CACHE_TTL_SECONDS=1800

# Kafka
KAFKA_BROKERS=kafka-0:9092,kafka-1:9092,kafka-2:9092
KAFKA_SASL_USERNAME=origin_ml
KAFKA_SASL_PASSWORD=<from_vault>
KAFKA_CONSUMER_GROUP=ml-service-consumer-group
KAFKA_TOPIC_SHIPMENT_CREATED=shipment.created
KAFKA_TOPIC_SENSOR_INGESTED=sensor.ingested
KAFKA_TOPIC_CUSTODY_HANDOFF=custody.handoff
KAFKA_TOPIC_KYC_SUBMITTED=kyc.submitted
KAFKA_TOPIC_ML_INFERENCE_COMPLETED=ml.inference.completed

# Models
S3_MODELS_BUCKET=origin-models
AWS_ACCESS_KEY_ID=<from_vault>
AWS_SECRET_ACCESS_KEY=<from_vault>
MODEL_RELOAD_INTERVAL_SECONDS=300
MODEL_LOCAL_PATH=/app/models
LSTM_SEQUENCE_LENGTH=60
ISOLATION_FOREST_CONTAMINATION=0.05

# Alert thresholds
ALERT_WARNING_THRESHOLD=50
ALERT_CRITICAL_THRESHOLD=75
```

---

### 7.4 Crypto Service (Rust)

```env
APP_ENV=production
APP_PORT=9000
RUST_LOG=info

# Database
DATABASE_URL=postgresql://crypto_svc:password@pgbouncer:5432/origin_db

# Kafka (rdkafka)
KAFKA_BROKERS=kafka-0:9092,kafka-1:9092,kafka-2:9092
KAFKA_SASL_USERNAME=origin_crypto
KAFKA_SASL_PASSWORD=<from_vault>
KAFKA_CONSUMER_GROUP=crypto-service-consumer-group
KAFKA_TOPIC_SHIPMENT_CREATED=shipment.created
KAFKA_TOPIC_ESCROW_CREATED=escrow.created
KAFKA_TOPIC_CUSTODY_HANDOFF=custody.handoff
KAFKA_TOPIC_MERKLE_COMMITTED=merkle.committed
KAFKA_TOPIC_BITCOIN_ANCHORED=bitcoin.anchored

# Bitcoin Core RPC
BITCOIN_RPC_URL=http://bitcoin-core.origin-crypto.svc.cluster.local:8332
BITCOIN_RPC_USER=<from_vault>
BITCOIN_RPC_PASSWORD=<from_vault>
BITCOIN_NETWORK=testnet
BITCOIN_WALLET_NAME=origin_system_wallet
BITCOIN_CONFIRMATION_POLL_INTERVAL_SECONDS=30
BITCOIN_RBF_TIMEOUT_SECONDS=1200
BITCOIN_RBF_MAX_RETRIES=3

# Merkle
MERKLE_BATCH_INTERVAL_SECONDS=600
MERKLE_ADVISORY_LOCK_ID=42001

# Vault (for system wallet private key)
VAULT_ADDR=http://vault.origin-infra.svc.cluster.local:8200
VAULT_ROLE=crypto-service
VAULT_SECRET_PATH=secret/origin/bitcoin/system_wallet

# mTLS
TLS_CERT_PATH=/etc/tls/tls.crt
TLS_KEY_PATH=/etc/tls/tls.key
TLS_CA_PATH=/etc/tls/ca.crt
```

---

### 7.5 IoT Ingestion Service

```env
APP_ENV=production
APP_PORT=8000
LOG_LEVEL=INFO

# TimescaleDB (asyncpg — COPY protocol)
TIMESCALEDB_URL=postgresql://iot_svc:password@timescaledb:5432/origin_ts
TIMESCALEDB_POOL_SIZE=30

# PostgreSQL (device registry)
DATABASE_URL=postgresql+asyncpg://iot_svc:password@pgbouncer:5432/origin_db

# Redis
REDIS_URL=rediss://redis-cluster:6379/0
DEVICE_CACHE_TTL_SECONDS=600

# Kafka
KAFKA_BROKERS=kafka-0:9092,kafka-1:9092,kafka-2:9092
KAFKA_SASL_USERNAME=origin_iot
KAFKA_SASL_PASSWORD=<from_vault>
KAFKA_TOPIC_SENSOR_INGESTED=sensor.ingested
```

---

### 7.6 Escrow Service

```env
APP_ENV=production
APP_PORT=8000
LOG_LEVEL=INFO

DATABASE_URL=postgresql+asyncpg://escrow_svc:password@pgbouncer:5432/origin_db

KAFKA_BROKERS=kafka-0:9092,kafka-1:9092,kafka-2:9092
KAFKA_SASL_USERNAME=origin_escrow
KAFKA_SASL_PASSWORD=<from_vault>
KAFKA_TOPIC_ESCROW_CREATED=escrow.created
KAFKA_TOPIC_ESCROW_SETTLED=escrow.settled
KAFKA_TOPIC_ALERT_CREATED=alert.created

CRYPTO_SERVICE_URL=https://crypto-service.origin-crypto.svc.cluster.local:9000
RELEASE_CONDITION_MAX_RISK_SCORE=30
```

---

### 7.7 Alert Service

```env
APP_ENV=production
APP_PORT=8000
LOG_LEVEL=INFO

DATABASE_URL=postgresql+asyncpg://alert_svc:password@pgbouncer:5432/origin_db
REDIS_URL=rediss://redis-cluster:6379/0

KAFKA_BROKERS=kafka-0:9092,kafka-1:9092,kafka-2:9092
KAFKA_SASL_USERNAME=origin_alert
KAFKA_SASL_PASSWORD=<from_vault>
KAFKA_TOPIC_ML_INFERENCE_COMPLETED=ml.inference.completed
KAFKA_TOPIC_ALERT_CREATED=alert.created

SENDGRID_API_KEY=<from_vault>
FCM_SERVER_KEY=<from_vault>
APNS_PRIVATE_KEY_PATH=/etc/apns/key.p8
APNS_KEY_ID=<from_vault>
APNS_TEAM_ID=<from_vault>

ALERT_WARNING_THRESHOLD=50.0
ALERT_CRITICAL_THRESHOLD=75.0
THRESHOLD_CACHE_TTL_SECONDS=3600
```

---

## 8. CI/CD Pipeline Plan

### 8.1 Pipeline Overview

```mermaid
flowchart LR
    subgraph DEV["Developer Workflow"]
        CODE["git push\nfeature/* branch"]
        PR["Pull Request\n→ main"]
    end

    subgraph CI["CI Pipeline (GitHub Actions)"]
        LINT["1. Lint\n(ruff, mypy, clippy)"]
        TEST["2. Unit Tests\n(pytest, cargo test)"]
        INTEG["3. Integration Tests\n(testcontainers)"]
        SAST["4. SAST Security Scan\n(Bandit, cargo-audit,\nTrivy, Semgrep)"]
        BUILD["5. Docker Build\n(multi-stage)"]
        SCAN_IMG["6. Container Image Scan\n(Trivy)"]
        PUSH["7. Push Image\n(ECR / GCR)\ntag: SHA + version"]
        DEPLOY_STG["8. Deploy to Staging\n(kubectl rollout)"]
        SMOKE["9. Smoke Tests\n(Postman / Newman)"]
    end

    subgraph CD["CD Pipeline (Manual Promote)"]
        APPROVE["10. Manual Approval\n(GitHub Environment Protection)"]
        DEPLOY_PROD["11. Deploy to Production\n(kubectl rollout — rolling update)"]
        VERIFY["12. Verify\n(smoke test + health checks)"]
        ROLLBACK["⚠️ Auto-Rollback\nif healthcheck fails"]
    end

    CODE --> LINT
    LINT --> TEST
    TEST --> INTEG
    INTEG --> SAST
    SAST --> BUILD
    BUILD --> SCAN_IMG
    SCAN_IMG --> PUSH
    PUSH --> DEPLOY_STG
    DEPLOY_STG --> SMOKE
    PR --> APPROVE
    SMOKE --> APPROVE
    APPROVE --> DEPLOY_PROD
    DEPLOY_PROD --> VERIFY
    VERIFY -->|"failure"| ROLLBACK
```

---

### 8.2 GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml

name: Origin CI/CD Pipeline

on:
  push:
    branches: [main, feature/*]
  pull_request:
    branches: [main]

env:
  REGISTRY: 123456789.dkr.ecr.ap-south-1.amazonaws.com
  IMAGE_TAG: ${{ github.sha }}

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dev deps
        run: pip install ruff mypy
      - name: Run ruff
        run: ruff check .
      - name: Run mypy
        run: mypy services/ --ignore-missing-imports
      - name: Rust clippy (crypto-service)
        run: |
          cd services/crypto-service
          cargo clippy -- -D warnings

  test:
    name: Unit Tests
    runs-on: ubuntu-24.04
    needs: lint
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: origin_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: [5432:5432]
      redis:
        image: redis:7
        ports: [6379:6379]
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install deps
        run: pip install -r requirements-dev.txt
      - name: Run pytest
        run: pytest tests/unit/ -v --cov=app --cov-report=xml
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/origin_test
          REDIS_URL: redis://localhost:6379/0
      - name: Rust unit tests
        run: |
          cd services/crypto-service
          cargo test

  integration-test:
    name: Integration Tests
    runs-on: ubuntu-24.04
    needs: test
    steps:
      - uses: actions/checkout@v4
      - name: Start services (Docker Compose)
        run: docker compose -f docker-compose.test.yml up -d
      - name: Wait for services
        run: sleep 20
      - name: Run integration tests
        run: pytest tests/integration/ -v
      - name: Tear down
        run: docker compose -f docker-compose.test.yml down

  security-scan:
    name: Security Scanning
    runs-on: ubuntu-24.04
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - name: Bandit SAST (Python)
        run: |
          pip install bandit
          bandit -r services/ -ll --exit-zero
      - name: cargo-audit (Rust)
        run: |
          cargo install cargo-audit
          cd services/crypto-service && cargo audit
      - name: Semgrep
        uses: semgrep/semgrep-action@v1
        with:
          config: auto
      - name: Dependency vulnerability scan
        run: |
          pip install safety
          safety check -r requirements.txt

  docker-build:
    name: Docker Build & Scan
    runs-on: ubuntu-24.04
    needs: [test, security-scan]
    strategy:
      matrix:
        service:
          - auth-service
          - user-service
          - shipment-service
          - ml-service
          - iot-ingestion-service
          - escrow-service
          - alert-service
          - audit-service
          - reporting-service
          - crypto-service
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1
      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2
      - name: Build Docker image
        run: |
          docker build \
            --target production \
            --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
            --build-arg VERSION=${{ github.sha }} \
            -t $REGISTRY/origin/${{ matrix.service }}:$IMAGE_TAG \
            -t $REGISTRY/origin/${{ matrix.service }}:latest \
            -f services/${{ matrix.service }}/Dockerfile \
            services/${{ matrix.service }}/
      - name: Trivy container scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/origin/${{ matrix.service }}:${{ env.IMAGE_TAG }}
          severity: CRITICAL,HIGH
          exit-code: 1
      - name: Push to ECR
        run: |
          docker push $REGISTRY/origin/${{ matrix.service }}:$IMAGE_TAG
          docker push $REGISTRY/origin/${{ matrix.service }}:latest

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-24.04
    needs: docker-build
    environment: staging
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Configure kubectl (staging)
        run: |
          aws eks update-kubeconfig \
            --name origin-staging \
            --region ap-south-1
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      - name: Run DB migrations
        run: |
          kubectl run migration --image=$REGISTRY/origin/shipment-service:$IMAGE_TAG \
            --restart=Never --rm -i \
            --namespace=origin-app \
            -- python -m alembic upgrade head
      - name: Deploy all services (rolling update)
        run: |
          for service in auth-service user-service shipment-service ml-service \
            iot-ingestion-service escrow-service alert-service audit-service \
            reporting-service; do
            kubectl set image deployment/$service \
              $service=$REGISTRY/origin/$service:$IMAGE_TAG \
              --namespace=origin-app
            kubectl rollout status deployment/$service --namespace=origin-app --timeout=120s
          done
          kubectl set image deployment/crypto-service \
            crypto-service=$REGISTRY/origin/crypto-service:$IMAGE_TAG \
            --namespace=origin-crypto
          kubectl rollout status deployment/crypto-service --namespace=origin-crypto --timeout=120s
      - name: Run smoke tests
        run: |
          pip install pytest httpx
          pytest tests/smoke/ -v \
            --base-url=https://staging.origin.app
        env:
          SMOKE_TEST_TOKEN: ${{ secrets.STAGING_SMOKE_TEST_TOKEN }}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-24.04
    needs: deploy-staging
    environment: production
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Configure kubectl (production)
        run: |
          aws eks update-kubeconfig \
            --name origin-prod \
            --region ap-south-1
      - name: Run DB migrations (production)
        run: |
          kubectl run migration-prod --image=$REGISTRY/origin/shipment-service:$IMAGE_TAG \
            --restart=Never --rm -i \
            --namespace=origin-app \
            -- python -m alembic upgrade head
      - name: Deploy to production (rolling — zero downtime)
        run: |
          for service in auth-service user-service shipment-service ml-service \
            iot-ingestion-service escrow-service alert-service audit-service reporting-service; do
            kubectl set image deployment/$service \
              $service=$REGISTRY/origin/$service:$IMAGE_TAG \
              --namespace=origin-app
            kubectl rollout status deployment/$service --namespace=origin-app --timeout=180s
          done
          kubectl set image deployment/crypto-service \
            crypto-service=$REGISTRY/origin/crypto-service:$IMAGE_TAG \
            --namespace=origin-crypto
      - name: Production smoke test
        run: pytest tests/smoke/ -v --base-url=https://app.origin.app
        env:
          SMOKE_TEST_TOKEN: ${{ secrets.PROD_SMOKE_TEST_TOKEN }}
      - name: Rollback on failure
        if: failure()
        run: |
          for service in auth-service user-service shipment-service ml-service \
            iot-ingestion-service escrow-service alert-service audit-service reporting-service; do
            kubectl rollout undo deployment/$service --namespace=origin-app
          done
          kubectl rollout undo deployment/crypto-service --namespace=origin-crypto
```

### 8.3 Zero-Downtime Deployment Strategy

1. **Rolling Update** — `maxSurge: 1`, `maxUnavailable: 0` on all deployments. New pods must be `Ready` before old pods are terminated.
2. **Readiness gates** — `kubectl rollout status` waits until all new pods pass readiness probes before the pipeline proceeds.
3. **DB migrations** — Always backward-compatible (additive: add columns, new tables, new indexes). Never drop or rename columns in the same release as the code deployment. Use expand-contract pattern for breaking changes.
4. **Feature flags** — New ML model versions are deployed with `is_active=false` and activated via a `PATCH model_versions` admin API — no deployment required.
5. **Rollback** — `kubectl rollout undo` reverts to the previous `ReplicaSet` in < 60s. Images are retained in ECR for 30 days.

---

## 9. Production Readiness Checklist

### 9.1 Monitoring & Observability

| Component | Tool | Config |
|---|---|---|
| **Metrics** | Prometheus + Grafana | All FastAPI services expose `/metrics` (prometheus-fastapi-instrumentator); Rust service exposes `/metrics` (prometheus crate) |
| **Distributed Tracing** | OpenTelemetry → Jaeger / AWS X-Ray | Trace context propagated via W3C `traceparent` header across all service calls |
| **Centralized Logging** | ELK Stack (Elasticsearch, Logstash, Kibana) / AWS CloudWatch Logs | JSON structured logging; all services use `structlog`; log level configurable via env var |
| **APM** | Grafana (Prometheus + Loki) | Service dashboards: P50/P95/P99 latency, error rate, throughput, Kafka consumer lag |
| **Uptime Monitoring** | Pingdom / Better Uptime | External health checks on `https://api.origin.app/health` every 60s |

**Key Prometheus Metrics per Service:**

```
origin_http_requests_total{service, method, endpoint, status_code}
origin_http_request_duration_seconds{service, method, endpoint}
origin_kafka_consumer_lag{service, topic, partition}
origin_ml_inference_duration_seconds{model_type}
origin_ml_risk_score_histogram{shipment_id, inference_type}
origin_bitcoin_confirmation_pending_total
origin_merkle_batch_duration_seconds
origin_escrow_settlements_total{status}
origin_alerts_created_total{severity}
origin_db_query_duration_seconds{service, query_name}
origin_redis_cache_hit_total{key_namespace}
origin_redis_cache_miss_total{key_namespace}
```

---

### 9.2 Alerting Rules (Prometheus AlertManager)

```yaml
groups:
  - name: origin-sla-alerts
    rules:
      - alert: HighApiLatency
        expr: histogram_quantile(0.95, rate(origin_http_request_duration_seconds_bucket[5m])) > 2.0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "API P95 latency > 2s"

      - alert: ServiceHighErrorRate
        expr: rate(origin_http_requests_total{status_code=~"5.."}[5m]) / rate(origin_http_requests_total[5m]) > 0.01
        for: 1m
        labels:
          severity: critical

      - alert: KafkaConsumerLagHigh
        expr: origin_kafka_consumer_lag > 5000
        for: 5m
        labels:
          severity: warning

      - alert: MLInferenceLatencyHigh
        expr: histogram_quantile(0.95, rate(origin_ml_inference_duration_seconds_bucket[5m])) > 2.0
        for: 2m
        labels:
          severity: warning

      - alert: BitcoinConfirmationPending
        expr: origin_bitcoin_confirmation_pending_total > 0
        for: 25m
        labels:
          severity: warning
        annotations:
          summary: "Bitcoin TX unconfirmed > 25 minutes. RBF retry may be needed."

      - alert: PostgresConnectionsHigh
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 2m
        labels:
          severity: critical

      - alert: RedisCacheMissRateHigh
        expr: rate(origin_redis_cache_miss_total[5m]) / (rate(origin_redis_cache_hit_total[5m]) + rate(origin_redis_cache_miss_total[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
```

---

### 9.3 Backup & Recovery

| Resource | Backup Method | Frequency | Retention | RTO | RPO |
|---|---|---|---|---|---|
| PostgreSQL | Automated RDS snapshots + WAL archiving to S3 | Daily snapshots + continuous WAL | 35 days | < 1h | < 5 min |
| TimescaleDB | `pg_basebackup` + WAL archiving | Daily | 30 days | < 2h | < 15 min |
| Redis | RDB snapshot | Every 1h | 7 days | < 15 min | < 1h (non-critical cache) |
| S3 Buckets | Cross-region replication | Real-time | Indefinite (versioned) | < 30 min | 0 |
| Kafka | Not backed up (PostgreSQL is SoT) | — | 7-day retention | N/A — replay from DLQ | N/A |
| Bitcoin wallet | Encrypted `wallet.dat` → S3 | Daily | Indefinite | < 4h | < 24h |
| Kubernetes manifests | Git (GitHub) | Real-time | Indefinite | < 30 min | 0 |

---

### 9.4 Security Checklist

- [x] All inter-service communication uses **mTLS** within the cluster
- [x] All secrets managed via **HashiCorp Vault** — no secrets in ConfigMaps or environment directly
- [x] **JWT RS256** signed with private key in Vault; public key distributed via JWKS endpoint
- [x] **bcrypt cost=12** for password hashing
- [x] **Row-Level Security (RLS)** on PostgreSQL for org data isolation
- [x] **Audit log** append-only (INSERT-only service role; RLS prevents UPDATE/DELETE)
- [x] **Container images** scanned with Trivy on every CI build
- [x] **SAST** with Bandit (Python), cargo-audit (Rust), Semgrep on every CI run
- [x] **WAF** (AWS WAF / Cloudflare) in front of load balancer
- [x] **Rate limiting** enforced at Nginx Ingress layer (and Redis-backed for per-`org_id` limits)
- [x] **Bitcoin Core RPC** not exposed outside private VPC; key in Vault HSM
- [x] **S3 buckets** private ACL, VPC endpoint only, SSE encryption, access logging enabled
- [x] **TLS 1.3** enforced on all external connections; TLS 1.2 minimum on internal
- [x] **IoT device auth** via HMAC-SHA256 pre-shared key (stored as hash, never as plaintext)
- [x] **PSBT signatures** validated cryptographically by Crypto Service before storage
- [x] **Network Policy** (Kubernetes) enforces that `origin-crypto` namespace only accepts traffic from `origin-app`
- [x] **PodSecurityPolicy** / **Pod Security Standards** — all pods run as non-root, read-only filesystem where possible

---

### 9.5 Logging Standards

All services log in **JSON structured format** with these mandatory fields:

```json
{
  "timestamp": "2026-02-20T10:00:00.000Z",
  "level": "INFO",
  "service": "shipment-service",
  "trace_id": "abc123",
  "span_id": "def456",
  "request_id": "req_uuid",
  "user_id": "usr_abc123",
  "org_id": "org_xyz",
  "message": "Shipment SHP-00012 created successfully",
  "metadata": {
    "shipment_id": "SHP-00012",
    "duration_ms": 234
  }
}
```

**Log retention:** 90 days hot (CloudWatch / Elasticsearch); 1 year cold (S3 Glacier).

**PII policy:** `email`, `password_hash`, `totp_secret`, `public_key` are **never logged**. Sensitive fields are masked: `password: "***"`.

---

### 9.6 Disaster Recovery Plan

| Scenario | Detection | Response | RTO |
|---|---|---|---|
| Service pod crash | Kubernetes liveness probe → auto-restart | K8s auto-restarts pod; if persistent: PagerDuty alert | < 60s |
| Database primary failure | CloudWatch / pg_stat + alert | RDS Multi-AZ auto-failover to standby | < 60s |
| Kafka broker failure | Consumer lag alert | 2 remaining brokers maintain RF=3 quorum (min.insync.replicas=2) | < 30s |
| Redis cache failure | Alert on connection errors | Services fall through to PostgreSQL (cache-aside pattern) — degraded performance | < 2 min |
| Bitcoin Core node failure | `origin_bitcoin_confirmation_pending_total` alert | Switch to standby Bitcoin Core node; manually re-broadcast pending TXs | < 2h |
| Full region failure | External uptime monitor | Manual failover to DR region (cross-region replica promoted); update Route53 DNS | < 4h |
| ML model corruption | Inference error rate spike | `is_active=false` for corrupt model → previous version re-activated; alert fires | < 15 min |
| Data breach | AWS GuardDuty / anomalous access alert | Rotate all secrets in Vault; revoke all JWT sessions; incident response playbook | N/A |

---

*End of Deployment Plan — Origin v1.0 | February 2026*
*This document is production-ready for DevOps and infrastructure engineering teams.*
