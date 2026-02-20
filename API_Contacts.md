# Origin — API Contracts

**Agricultural Supply Chain Fraud Detection System**
**Author:** Jagadish Sunil Pednekar | **Version:** 1.0 | **February 2026**

---

## Table of Contents

1. [API Design Principles](#1-api-design-principles)
2. [Auth Service](#2-auth-service)
3. [User Service](#3-user-service)
4. [Shipment Service](#4-shipment-service)
5. [IoT Ingestion Service](#5-iot-ingestion-service)
6. [ML Service](#6-ml-service)
7. [Alert Service](#7-alert-service)
8. [Escrow Service](#8-escrow-service)
9. [Crypto Service](#9-crypto-service)
10. [Audit Service](#10-audit-service)
11. [Reporting Service](#11-reporting-service)
12. [Service-to-Service Internal APIs](#12-service-to-service-internal-apis)
13. [Event-Driven API Contracts (Kafka)](#13-event-driven-api-contracts-kafka)

---

## 1. API Design Principles

### 1.1 Authentication

| Client Type | Method | Details |
|---|---|---|
| Web / Mobile | JWT (RS256) | `Authorization: Bearer <token>` · Access token TTL: 1h · Refresh token TTL: 30d |
| IoT Devices | HMAC-SHA256 device token | Pre-shared symmetric key registered at device binding · `X-Device-Signature: hmac_sha256_hex` |
| Service-to-Service (internal) | mTLS | Mutual TLS on internal cluster network — not exposed through the API Gateway |

**JWT Claims structure:**
```json
{
  "sub": "usr_uuid",
  "email": "user@company.com",
  "role": "shipper",
  "org_id": "org_uuid",
  "kyc_verified": true,
  "escrow_limit": 100000,
  "2fa_verified": true,
  "iat": 1708425600,
  "exp": 1708429200
}
```

### 1.2 Error Response Format

All errors return a consistent envelope:

```json
{
  "error": {
    "code": "SHIPMENT_NOT_FOUND",
    "message": "Shipment SHP-00012 does not exist or is not accessible.",
    "details": {},
    "request_id": "req_abc123",
    "timestamp": "2026-02-20T10:00:00Z"
  }
}
```

| HTTP Status | Meaning |
|---|---|
| `400` | Validation error — malformed request body or missing required fields |
| `401` | Unauthenticated — missing or expired JWT / invalid HMAC |
| `403` | Unauthorized — valid token but insufficient role or org scope |
| `404` | Resource not found |
| `409` | Conflict — duplicate record (email, tax_id, device already bound) |
| `422` | Unprocessable entity — valid JSON but business logic rejection |
| `423` | Locked — account locked after failed attempts |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
| `503` | Service temporarily unavailable |

### 1.3 Pagination Standard

All list endpoints use cursor-based pagination:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 154,
    "next_cursor": "eyJpZCI6InV1aWQifQ==",
    "has_more": true
  }
}
```

Query parameters: `?page=1&page_size=20&cursor=<token>&sort=created_at&order=desc`

### 1.4 Versioning

All public endpoints are versioned via URL prefix: `/api/v1/`.

Breaking changes require a new version segment: `/api/v2/`.

### 1.5 Rate Limiting

| Tier | Limit | Window |
|---|---|---|
| Public (unauthenticated) | 20 req | 1 min per IP |
| Authenticated (standard) | 300 req | 1 min per `org_id` |
| IoT ingestion | 1000 req | 1 min per `device_id` |
| Internal service-to-service | Unlimited (mTLS only) | — |

Rate limit headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### 1.6 Idempotency

All `POST` mutation endpoints that create resources accept an `Idempotency-Key` header (UUID v4).

```
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

The server stores the response for 24 hours keyed by `Idempotency-Key`. Duplicate requests within that window return the cached response with `HTTP 200` and `X-Idempotent-Replayed: true`.

### 1.7 Request/Response Conventions

- All timestamps: ISO 8601 UTC — `2026-02-20T10:00:00Z`
- All monetary amounts: satoshis (integer) for Bitcoin; USD cents (integer) for fiat display
- All UUIDs: lowercase hyphenated `uuid v4`
- Content-Type: `application/json` unless file upload (`multipart/form-data`)
- File uploads: `multipart/form-data` with `Content-Type` validated server-side

---

## 2. Auth Service

Base path: `/api/v1/auth`

---

### POST /api/v1/auth/register

**Purpose:** Multi-step organization and user registration.
**Auth:** None (public)
**Roles:** N/A

**Request:**
```json
{
  "role": "shipper",
  "first_name": "Arjun",
  "last_name": "Mehta",
  "work_email": "arjun@freshfarms.co",
  "phone": "+919876543210",
  "legal_company_name": "Fresh Farms Pvt Ltd",
  "tax_id": "GSTIN123456",
  "hq_country": "IN",
  "password": "SecurePass123!",
  "compliance_document": "<base64_encoded_file | omit for multipart>"
}
```

**Response `201`:**
```json
{
  "user_id": "usr_abc123",
  "org_id": "org_xyz",
  "status": "pending_email_verification",
  "message": "Verification email sent to arjun@freshfarms.co"
}
```

**Error Responses:**
- `409` — Duplicate email or tax_id
- `422` — Field validation failure (returns field-level errors)
- `400` — Unsupported document format

**DB Operations:**
- `INSERT` → `organizations` (status=`pending_verification`)
- `INSERT` → `users` (status=`pending_email_verification`)
- `INSERT` → `kyc_records` (if document provided)

**Events Published:** `kyc.submitted` (if compliance document uploaded)

**Business Logic:**
1. Validate all fields; check email uniqueness in `users` table
2. Hash password with bcrypt (cost=12)
3. `INSERT` organization as `status=pending_verification`
4. `INSERT` user as `status=pending_email_verification`
5. If `compliance_document` present: upload to `S3 origin-kyc/`, insert `kyc_records`, publish `kyc.submitted`
6. Send verification email via SendGrid/SES
7. Log registration event to `audit_logs`

---

### POST /api/v1/auth/login

**Purpose:** Email/password authentication returning JWT tokens.
**Auth:** None (public)
**Roles:** N/A

**Request:**
```json
{
  "email": "arjun@freshfarms.co",
  "password": "SecurePass123!",
  "remember_device": false
}
```

**Response `200`:**
```json
{
  "access_token": "<rs256_jwt>",
  "refresh_token": "<uuid_v4>",
  "expires_in": 3600,
  "requires_2fa": true,
  "user": {
    "id": "usr_abc123",
    "email": "arjun@freshfarms.co",
    "role": "shipper",
    "org_id": "org_xyz",
    "kyc_verified": true
  }
}
```

**Error Responses:**
- `401` — Invalid credentials
- `423` — Account locked (5 failed attempts)
- `403` — Account suspended or unverified email

**DB Operations:**
- `SELECT` → `users` (by email)
- `INSERT` → `user_sessions`
- `INSERT` → `audit_logs`

**Business Logic:**
1. Validate email format → lookup user by email in `users`
2. bcrypt.compare(password, password_hash)
3. Check Redis `lockout:{email}` counter — reject if ≥5
4. If wrong password: increment Redis `lockout:{email}` (TTL: 15 min)
5. Check `users.status` (active, suspended, pending_email_verification)
6. Generate RS256 JWT with role claims (exp: 1h)
7. Generate refresh token (UUID v4), `INSERT user_sessions`
8. If `remember_device=true`: set device fingerprint cookie (30d)
9. `INSERT audit_logs` (event_type: `user.login`)

---

### POST /api/v1/auth/2fa/verify

**Purpose:** TOTP verification to complete authentication.
**Auth:** Partial JWT (pre-2FA token)
**Roles:** All

**Request:**
```json
{
  "otp_code": "482910",
  "trust_device": false
}
```

**Response `200`:**
```json
{
  "access_token": "<rs256_jwt_with_2fa_claim>",
  "refresh_token": "<uuid_v4>",
  "expires_in": 3600
}
```

**Error Responses:**
- `401` — OTP expired or invalid
- `423` — Locked after 5 failed 2FA attempts

**DB Operations:**
- `SELECT` → `users` (totp_secret)
- `UPDATE` → `user_sessions` (is_2fa_verified=true)

**Business Logic:**
1. Validate TOTP against `users.totp_secret` using pyotp (30s window)
2. Check OTP not replayed — check Redis `otp:used:{user_id}:{code}` (TTL: 90s)
3. Mark OTP used in Redis
4. If `trust_device=true`: issue 30d device token
5. Issue final JWT with `2fa_verified: true` claim
6. Update `user_sessions.is_2fa_verified = true`

---

### GET /api/v1/auth/sso/{provider}/callback

**Purpose:** OAuth2/OIDC SSO callback for Azure AD, Google, Okta.
**Auth:** None (OAuth2 callback)
**Roles:** N/A

**Path Parameters:** `provider` — `azure`, `google`, `okta`

**Query Parameters:** `code` (auth code), `state` (CSRF token)

**Response `200`:**
```json
{
  "access_token": "<rs256_jwt>",
  "refresh_token": "<uuid_v4>",
  "user": {
    "id": "usr_abc123",
    "email": "arjun@company.com",
    "role": "shipper",
    "org_id": "org_xyz"
  }
}
```

**DB Operations:**
- `SELECT/INSERT` → `users` (upsert on email)
- `SELECT` → `organizations` (match by email domain)
- `INSERT` → `user_sessions`

---

### POST /api/v1/auth/token/refresh

**Purpose:** Rotate refresh token and issue new access token.
**Auth:** Valid refresh token in body
**Roles:** All

**Request:**
```json
{
  "refresh_token": "<uuid_v4>"
}
```

**Response `200`:**
```json
{
  "access_token": "<rs256_jwt>",
  "refresh_token": "<new_uuid_v4>",
  "expires_in": 3600
}
```

**DB Operations:**
- `SELECT` → `user_sessions` (validate refresh_token, check expiry)
- `UPDATE` → `user_sessions` (rotate refresh_token, update expires_at)

---

### POST /api/v1/auth/logout

**Purpose:** Invalidate current session.
**Auth:** JWT required
**Roles:** All

**Response `204`:** No content.

**DB Operations:**
- `DELETE` → `user_sessions` (by refresh_token)

**Cache:** `DEL session:{user_id}:{session_id}` in Redis

---

### POST /api/v1/kyc/submit

**Purpose:** Submit KYC identity document for review.
**Auth:** JWT required
**Roles:** All

**Request:** `multipart/form-data`
```
document_type: "business_license"
file: <binary>
```

**Response `202`:**
```json
{
  "kyc_record_id": "kyc_abc123",
  "status": "pending",
  "message": "Document submitted for review. Expected: 2-3 business days."
}
```

**DB Operations:**
- `INSERT` → `kyc_records`

**Events Published:** `kyc.submitted`

---

### GET /api/v1/kyc/status

**Purpose:** Get KYC verification status for authenticated user.
**Auth:** JWT required
**Roles:** All

**Response `200`:**
```json
{
  "kyc_status": "approved",
  "document_type": "business_license",
  "submitted_at": "2026-02-18T09:00:00Z",
  "reviewed_at": "2026-02-19T14:00:00Z",
  "rejection_reason": null
}
```

**DB Operations:**
- `SELECT` → `kyc_records` (by user_id from JWT)

---

## 3. User Service

Base path: `/api/v1/users`

---

### GET /api/v1/users/me

**Purpose:** Get current authenticated user's profile.
**Auth:** JWT required
**Roles:** All

**Response `200`:**
```json
{
  "id": "usr_abc123",
  "email": "arjun@freshfarms.co",
  "role": "shipper",
  "org_id": "org_xyz",
  "org": {
    "id": "org_xyz",
    "legal_name": "Fresh Farms Pvt Ltd",
    "status": "active",
    "hq_country": "IN"
  },
  "kyc_status": "approved",
  "status": "active",
  "last_login_at": "2026-02-20T09:00:00Z",
  "created_at": "2026-01-01T00:00:00Z"
}
```

**DB Operations:**
- `SELECT` → `users` JOIN `organizations`

---

### PATCH /api/v1/users/me

**Purpose:** Update current user profile (name, phone).
**Auth:** JWT required
**Roles:** All

**Request:**
```json
{
  "first_name": "Arjun",
  "last_name": "Mehta",
  "phone": "+919876543210"
}
```

**Response `200`:** Updated user object.

**DB Operations:**
- `UPDATE` → `users`
- `INSERT` → `audit_logs`

---

### GET /api/v1/users/{id}

**Purpose:** Get user profile by ID (org-scoped).
**Auth:** JWT required
**Roles:** `admin`, `auditor`

**Response `200`:** User object (same schema as `/me`).

**DB Operations:**
- `SELECT` → `users` WHERE `org_id = JWT.org_id` (RLS enforced)

---

### GET /api/v1/organizations/{id}

**Purpose:** Get organization details.
**Auth:** JWT required
**Roles:** All (own org); `admin`, `auditor` (any org)

**Response `200`:**
```json
{
  "id": "org_xyz",
  "legal_name": "Fresh Farms Pvt Ltd",
  "tax_id": "GSTIN123456",
  "hq_country": "IN",
  "status": "active",
  "member_count": 12,
  "created_at": "2026-01-01T00:00:00Z"
}
```

**DB Operations:**
- `SELECT` → `organizations`

---

### POST /api/v1/users/wallet-keys

**Purpose:** Register a Bitcoin public key for PSBT signing.
**Auth:** JWT required
**Roles:** `shipper`, `financier`, `admin`

**Request:**
```json
{
  "public_key": "02abc123...compressed_secp256k1_hex",
  "key_type": "escrow_signer"
}
```

**Response `201`:**
```json
{
  "key_id": "key_abc123",
  "public_key": "02abc123...",
  "key_type": "escrow_signer",
  "created_at": "2026-02-20T10:00:00Z"
}
```

**DB Operations:**
- `INSERT` → `wallet_keys`

---

### GET /api/v1/users/wallet-keys

**Purpose:** List registered public keys for current user.
**Auth:** JWT required
**Roles:** All

**Response `200`:**
```json
{
  "data": [
    {
      "key_id": "key_abc123",
      "public_key": "02abc123...",
      "key_type": "escrow_signer",
      "is_active": true,
      "created_at": "2026-02-20T10:00:00Z"
    }
  ]
}
```

**DB Operations:**
- `SELECT` → `wallet_keys` WHERE `user_id = JWT.sub`

---

## 4. Shipment Service

Base path: `/api/v1/shipments`

---

### POST /api/v1/shipments

**Purpose:** Create a new shipment with IoT binding, ML pre-check, escrow initialization, and Merkle leaf computation.
**Auth:** JWT required
**Roles:** `shipper`, `admin`

**Request:**
```json
{
  "origin_port": "INBOM",
  "destination_port": "GBLON",
  "carrier_org_id": "org_carrier_123",
  "buyer_org_id": "org_buyer_456",
  "estimated_departure": "2026-03-01T06:00:00Z",
  "manifest_description": "500kg Alphonso Mangoes",
  "cargo_category": "fresh_produce",
  "weight_kg": 500.0,
  "sensor_device_ids": ["dev_001", "dev_002"],
  "escrow_amount_satoshis": 1500000,
  "release_conditions": {
    "max_risk_score": 30,
    "require_delivery_confirmation": true
  }
}
```

**Request (with manifest upload):** `multipart/form-data` — add `manifest_files[]` field.

**Response `201`:**
```json
{
  "shipment_id": "SHP-00012",
  "status": "active",
  "ml_precheck_score": 18.5,
  "merkle_leaf_hash": "a3f4c2d1e5b8f9a0...",
  "escrow_agreement_id": "esc_001",
  "created_at": "2026-02-20T10:00:00Z"
}
```

**Error Responses:**
- `422` — Sensor already bound to another active shipment
- `422` — Carrier org not registered or KYC not approved
- `422` — Escrow amount exceeds org escrow limit
- `400` — Missing required fields

**DB Operations:**
- `INSERT` → `shipments`
- `INSERT` → `shipment_events` (event_type: `created`)
- `UPDATE` → `iot_devices` (bind to shipment)
- `INSERT` → `escrow_agreements` (via Escrow Service call)
- `INSERT` → `merkle_leaves` (committed=false, via Crypto Service call)

**Events Published:** `shipment.created`

**Business Logic:**
1. Validate all fields (ports are UN/LOCODE, cargo_category is allowed enum)
2. `HTTP POST /internal/ml/risk/precheck` → get `ml_precheck_score` (timeout: 5s)
3. Upload `manifest_files` to `S3 origin-manifests/` via boto3; store S3 keys
4. `INSERT shipments` (status=`active`, manifest_s3_key)
5. Validate each `device_id` — check not bound to another active shipment; `UPDATE iot_devices`
6. `HTTP POST /internal/escrow/init` → create `escrow_agreements` (status=`initialized`)
7. `HTTP POST /internal/crypto/merkle/leaf` → compute and store leaf hash
8. Publish `shipment.created` to Kafka
9. Return `201` with `shipment_id`, `ml_precheck_score`, `merkle_leaf_hash`, `escrow_agreement_id`

**Failure / Rollback:** Any synchronous failure → set `shipment.status=draft`, delete IoT bindings, return `draft_id` for recovery.

---

### GET /api/v1/shipments

**Purpose:** Paginated list of shipments for the authenticated org.
**Auth:** JWT required
**Roles:** All (org-scoped)

**Query Parameters:**
```
status=active|in_transit|delivered|disputed
cargo_category=fresh_produce
page=1
page_size=20
sort=created_at
order=desc
```

**Response `200`:**
```json
{
  "data": [
    {
      "shipment_id": "SHP-00012",
      "origin_port": "INBOM",
      "destination_port": "GBLON",
      "cargo_category": "fresh_produce",
      "status": "in_transit",
      "ml_risk_score": 42.5,
      "estimated_departure": "2026-03-01T06:00:00Z",
      "created_at": "2026-02-20T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 87,
    "has_more": true
  }
}
```

**DB Operations:**
- `SELECT` → `shipments` WHERE `org_id = JWT.org_id` (RLS enforced)
- **Cache:** `shipments:list:{org_id}:{page}:{filters_hash}` (TTL: 60s)

---

### GET /api/v1/shipments/{id}

**Purpose:** Full shipment detail including events, alerts, escrow status.
**Auth:** JWT required
**Roles:** All (org-scoped; `auditor` has cross-org read)

**Response `200`:**
```json
{
  "shipment_id": "SHP-00012",
  "shipment_code": "SHP-00012",
  "org_id": "org_xyz",
  "carrier_org_id": "org_carrier_123",
  "buyer_org_id": "org_buyer_456",
  "origin_port": "INBOM",
  "destination_port": "GBLON",
  "cargo_category": "fresh_produce",
  "weight_kg": 500.0,
  "status": "in_transit",
  "ml_risk_score": 42.5,
  "merkle_leaf_hash": "a3f4c2...",
  "estimated_departure": "2026-03-01T06:00:00Z",
  "actual_arrival": null,
  "escrow": {
    "escrow_agreement_id": "esc_001",
    "status": "funded",
    "amount_satoshis": 1500000
  },
  "open_alerts": 2,
  "created_at": "2026-02-20T10:00:00Z"
}
```

**DB Operations:**
- `SELECT` → `shipments` JOIN `escrow_agreements`
- `SELECT` → `alerts` WHERE `shipment_id` AND `status=open` (COUNT)
- **Cache:** `ml:score:{shipment_id}` (Redis, TTL: 300s)

---

### PATCH /api/v1/shipments/{id}/status

**Purpose:** Update shipment status (e.g., mark as delivered).
**Auth:** JWT required
**Roles:** `carrier`, `admin`

**Request:**
```json
{
  "status": "delivered",
  "delivery_confirmation_note": "Delivered to cold storage Warehouse B"
}
```

**Response `200`:**
```json
{
  "shipment_id": "SHP-00012",
  "status": "delivered",
  "updated_at": "2026-03-10T14:00:00Z"
}
```

**DB Operations:**
- `UPDATE` → `shipments` (status, updated_at)
- `INSERT` → `shipment_events` (event_type: `status_change`)
- `INSERT` → `audit_logs`

**Events Published:** `shipment.created` (status_change payload)

---

### POST /api/v1/shipments/{id}/custody

**Purpose:** Record a cryptographically signed custody handoff event.
**Auth:** JWT required
**Roles:** `carrier`, `admin`

**Request:**
```json
{
  "event_type": "handoff",
  "gps_latitude": 18.9667,
  "gps_longitude": 72.8333,
  "ecdsa_signature": "3045022100...DER_encoded_hex",
  "signature_public_key": "02abc123...compressed_hex",
  "timestamp": "2026-02-25T08:00:00Z"
}
```

**Response `201`:**
```json
{
  "custody_event_id": "cust_abc123",
  "event_hash": "sha256_hex_of_event",
  "previous_event_hash": "sha256_hex_of_prev_event",
  "timestamp": "2026-02-25T08:00:00Z"
}
```

**DB Operations:**
- `SELECT` → `custody_events` (get previous event hash for chaining)
- `INSERT` → `custody_events`
- `INSERT` → `merkle_leaves` (committed=false)

**Events Published:** `custody.handoff`

**Business Logic:**
1. Validate `custodian_org_id` matches JWT `org_id`
2. Verify ECDSA signature against event data using `signature_public_key`
3. Fetch last `custody_events.event_hash` for this shipment (for `previous_event_hash` chaining)
4. Compute `event_hash = SHA-256(event_type || shipment_id || timestamp || gps_lat || gps_lng)`
5. `INSERT custody_events`; `INSERT merkle_leaves`
6. Publish `custody.handoff` to Kafka

---

### GET /api/v1/shipments/{id}/custody

**Purpose:** Get full chain-of-custody ledger for a shipment.
**Auth:** JWT required
**Roles:** All

**Response `200`:**
```json
{
  "shipment_id": "SHP-00012",
  "custody_events": [
    {
      "custody_event_id": "cust_001",
      "custodian_org_id": "org_carrier_123",
      "event_type": "pickup",
      "gps_latitude": 18.9667,
      "gps_longitude": 72.8333,
      "event_hash": "sha256_hex",
      "previous_event_hash": null,
      "ecdsa_signature": "3045...",
      "timestamp": "2026-03-01T07:00:00Z"
    }
  ]
}
```

**DB Operations:**
- `SELECT` → `custody_events` WHERE `shipment_id` ORDER BY `timestamp ASC`

---

### GET /api/v1/shipments/{id}/telemetry

**Purpose:** Get IoT sensor time-series for a shipment (last 24h by default).
**Auth:** JWT required
**Roles:** All

**Query Parameters:** `from=2026-03-01T00:00:00Z&to=2026-03-02T00:00:00Z&device_id=dev_001`

**Response `200`:**
```json
{
  "shipment_id": "SHP-00012",
  "device_id": "dev_001",
  "readings": [
    {
      "timestamp": "2026-03-01T10:00:00Z",
      "temperature_celsius": 3.4,
      "humidity_percent": 82.1,
      "latitude": 18.9667,
      "longitude": 72.8333,
      "tilt_degrees": 2.1
    }
  ],
  "aggregates": {
    "temp_mean": 3.6,
    "temp_min": 2.1,
    "temp_max": 5.8,
    "reading_count": 1440
  }
}
```

**DB Operations:**
- `SELECT` → `sensor_readings` (TimescaleDB hypertable, time-range query)
- Uses continuous aggregate materialized views for `aggregates`

---

### GET /api/v1/shipments/{id}/risk

**Purpose:** Get current ML risk score for a shipment.
**Auth:** JWT required
**Roles:** All

**Response `200`:**
```json
{
  "shipment_id": "SHP-00012",
  "risk_score": 42.5,
  "anomaly_flag": false,
  "inference_type": "spoilage",
  "model_version": "1.3.0",
  "confidence": 0.87,
  "computed_at": "2026-02-20T09:55:00Z",
  "cache_hit": true
}
```

**Cache:** `ml:score:{shipment_id}` (Redis TTL: 300s). If cache miss, triggers async inference and returns last persisted score.

**DB Operations:**
- `SELECT` → `ml_inference_results` WHERE `shipment_id` ORDER BY `created_at DESC LIMIT 1`

---

### GET /api/v1/shipments/{id}/proof/pdf

**Purpose:** Generate and download cryptographic audit proof PDF.
**Auth:** JWT required
**Roles:** `auditor`, `shipper`, `admin`

**Response `200`:**
```json
{
  "download_url": "https://s3.amazonaws.com/origin-proofs/SHP-00012/proof_20260220.pdf?X-Amz-Signature=...",
  "expires_at": "2026-02-20T10:15:00Z",
  "generated_at": "2026-02-20T10:00:00Z"
}
```

**Logic:** Async PDF generation via Celery worker (WeasyPrint). Contains: Merkle proof path, Bitcoin txid, custody event ECDSA signatures, ML risk summary. Pre-signed S3 URL returned (TTL: 15 min).

**DB Operations:**
- `SELECT` → `shipments`, `custody_events`, `ml_inference_results`, `merkle_leaves`, `bitcoin_commitments`

---

## 5. IoT Ingestion Service

Base path: `/api/v1/iot`

---

### POST /api/v1/iot/ingest

**Purpose:** Ingest batch sensor readings from a registered IoT device.
**Auth:** HMAC-SHA256 device token (`X-Device-Signature` header)
**Roles:** IoT device (not JWT)

**Headers:**
```
X-Device-ID: dev_001
X-Device-Signature: hmac_sha256_hex_of_body
Content-Type: application/json
```

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
    },
    {
      "timestamp": "2026-02-20T10:06:00Z",
      "temperature_celsius": 3.6,
      "humidity_percent": 81.9,
      "latitude": 18.9668,
      "longitude": 72.8334,
      "tilt_degrees": 1.8
    }
  ]
}
```

**Response `202`:**
```json
{
  "accepted": true,
  "reading_count": 2,
  "batch_id": "batch_uuid_v4"
}
```

**Error Responses:**
- `401` — Invalid HMAC signature
- `403` — Device not bound to stated shipment
- `400` — Malformed payload or timestamp out of range

**DB Operations:**
- `SELECT` → `iot_devices` (device auth + shipment binding check) — **Redis cache**: `iot:device:{device_id}` (TTL: 600s)
- `INSERT` (bulk) → `sensor_readings` (TimescaleDB hypertable, asyncpg COPY protocol)

**Events Published:** `sensor.ingested`

**Business Logic:**
1. Validate HMAC signature: `HMAC-SHA256(request_body, device_hmac_key)`
2. Lookup device from Redis cache (`iot:device:{device_id}`) or PostgreSQL fallback
3. Validate `device.shipment_id == request.shipment_id` and `device.status == active`
4. Normalize all readings to standard units
5. Bulk INSERT to TimescaleDB `sensor_readings` via asyncpg COPY protocol
6. Publish `sensor.ingested` to Kafka (key: `device_id`)

---

### POST /api/v1/iot/devices/register

**Purpose:** Register a new IoT device and bind to an organization.
**Auth:** JWT required
**Roles:** `admin`, `shipper`

**Request:**
```json
{
  "device_serial": "SN-TEMP-20260101-001",
  "org_id": "org_xyz",
  "hmac_key": "pre_shared_256bit_hex_key"
}
```

**Response `201`:**
```json
{
  "device_id": "dev_uuid",
  "device_serial": "SN-TEMP-20260101-001",
  "status": "unbound",
  "created_at": "2026-02-20T10:00:00Z"
}
```

**DB Operations:**
- `INSERT` → `iot_devices` (stores SHA-256 hash of hmac_key — NOT the key itself)

---

### GET /api/v1/iot/devices

**Purpose:** List devices registered to the authenticated org.
**Auth:** JWT required
**Roles:** `admin`, `shipper`

**Response `200`:**
```json
{
  "data": [
    {
      "device_id": "dev_001",
      "device_serial": "SN-TEMP-001",
      "shipment_id": "SHP-00012",
      "status": "active",
      "last_heartbeat_at": "2026-02-20T10:06:00Z"
    }
  ]
}
```

**DB Operations:**
- `SELECT` → `iot_devices` WHERE `org_id = JWT.org_id`

---

## 6. ML Service

Base path: `/api/v1/ml`

---

### POST /api/v1/ml/risk/precheck

**Purpose:** Synchronous risk pre-check during shipment creation.
**Auth:** JWT required (internal: mTLS from Shipment Service)
**Roles:** `shipper`, `admin`; internal: service-to-service

**Request:**
```json
{
  "origin_port": "INBOM",
  "destination_port": "GBLON",
  "carrier_org_id": "org_carrier_123",
  "cargo_category": "fresh_produce",
  "estimated_departure": "2026-03-01T06:00:00Z",
  "weight_kg": 500.0
}
```

**Response `200`:**
```json
{
  "risk_score": 18.5,
  "confidence": 0.91,
  "inference_type": "precheck",
  "model_version": "1.3.0",
  "insights": {
    "carrier_risk": "low",
    "route_complexity": "medium",
    "seasonal_risk": "low"
  },
  "computed_at": "2026-02-20T10:00:05Z"
}
```

**DB Operations:**
- `SELECT` → `participant_risk_scores` (carrier org's latest GNN score)
- `SELECT` → `model_versions` (active precheck model)

**Business Logic:**
1. Fetch `carrier_org_id` risk score from `participant_risk_scores` (last 24h)
2. Run ensemble classifier on route + carrier + cargo features
3. Return composite risk score (timeout: 5s — shipment creation waits synchronously)

---

### GET /api/v1/ml/shipments/{id}/spoilage-score

**Purpose:** Get spoilage risk score for a shipment.
**Auth:** JWT required
**Roles:** All

**Response `200`:**
```json
{
  "shipment_id": "SHP-00012",
  "spoilage_risk_score": 34.2,
  "anomaly_flag": false,
  "inference_details": {
    "isolation_forest_score": 28.1,
    "lstm_autoencoder_mse": 0.034,
    "lstm_anomaly_score": 40.3,
    "composite_score": 34.2
  },
  "features": {
    "cumulative_exposure": 12.4,
    "rate_of_temperature_change": 0.12,
    "handling_violation_score": 5.0
  },
  "model_version": "1.3.0",
  "computed_at": "2026-02-20T09:55:00Z"
}
```

**DB Operations:**
- `SELECT` → `ml_inference_results` WHERE `shipment_id` AND `inference_type=spoilage`
- `SELECT` → `sensor_readings` (TimescaleDB — last 60 readings for feature extraction)
- **Cache:** `ml:score:{shipment_id}` (Redis TTL: 300s)

---

### GET /api/v1/ml/shipments/{id}/route-analysis

**Purpose:** Get route deviation analysis for a shipment.
**Auth:** JWT required
**Roles:** All

**Response `200`:**
```json
{
  "shipment_id": "SHP-00012",
  "route_deviation_score": 12.7,
  "deviation_distance_km": 3.4,
  "anomaly_flag": false,
  "planned_route_adherence_pct": 94.2,
  "last_known_position": {
    "latitude": 18.9668,
    "longitude": 72.8334,
    "timestamp": "2026-02-20T10:06:00Z"
  },
  "model_version": "1.3.0"
}
```

**DB Operations:**
- `SELECT` → `ml_inference_results` WHERE `inference_type=route_deviation`
- `SELECT` → `sensor_readings` (latest GPS readings — TimescaleDB)

---

### GET /api/v1/ml/shipments/{id}/tampering-analysis

**Purpose:** Get data tampering analysis for a shipment's sensor stream.
**Auth:** JWT required
**Roles:** `auditor`, `admin`

**Response `200`:**
```json
{
  "shipment_id": "SHP-00012",
  "tampering_risk_score": 8.1,
  "anomaly_flag": false,
  "techniques_applied": ["benfords_law", "arima_residual", "signal_correlation"],
  "benford_deviation_score": 5.2,
  "arima_residual_score": 11.0,
  "signal_correlation_score": 8.1,
  "model_version": "1.3.0",
  "computed_at": "2026-02-20T08:00:00Z"
}
```

**DB Operations:**
- `SELECT` → `ml_inference_results` WHERE `inference_type=tampering`

---

### GET /api/v1/ml/participants/{org_id}/risk-score

**Purpose:** Get GNN-based risk score for a supply chain participant org.
**Auth:** JWT required
**Roles:** `auditor`, `admin`, `financier`

**Response `200`:**
```json
{
  "org_id": "org_carrier_123",
  "risk_score": 22.5,
  "score_date": "2026-02-20",
  "model_version": "gnn_1.2.0",
  "risk_factors": {
    "historical_fraud_incidents": 0,
    "route_deviation_frequency": "low",
    "avg_shipment_risk": 21.0
  }
}
```

**DB Operations:**
- `SELECT` → `participant_risk_scores` WHERE `org_id` AND `score_date = TODAY`

---

### POST /api/v1/ml/shipments/{id}/infer

**Purpose:** Trigger full ML inference pipeline for a shipment (on-demand).
**Auth:** JWT required (internal: mTLS from other services)
**Roles:** `admin`; internal service

**Request:**
```json
{
  "inference_types": ["spoilage", "route_deviation", "tampering", "provenance"]
}
```

**Response `202`:**
```json
{
  "job_id": "infer_job_uuid",
  "shipment_id": "SHP-00012",
  "status": "queued",
  "estimated_completion_ms": 2000
}
```

**Events Published:** (internally triggers inference → publishes `ml.inference.completed`)

---

## 7. Alert Service

Base path: `/api/v1/alerts`

---

### GET /api/v1/alerts

**Purpose:** Paginated list of alerts for the authenticated org.
**Auth:** JWT required
**Roles:** All

**Query Parameters:**
```
shipment_id=SHP-00012
severity=critical|warning|info
status=open|acknowledged|resolved
page=1&page_size=20
```

**Response `200`:**
```json
{
  "data": [
    {
      "alert_id": "alert_abc123",
      "shipment_id": "SHP-00012",
      "alert_type": "sensor_breach",
      "severity": "critical",
      "status": "open",
      "message": "Temperature exceeded 8°C for 45 minutes. Spoilage risk: 78.2.",
      "ml_confidence": 0.91,
      "created_at": "2026-02-20T10:10:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 5,
    "has_more": false
  }
}
```

**DB Operations:**
- `SELECT` → `alerts` WHERE `shipment_id IN (SELECT id FROM shipments WHERE org_id = JWT.org_id)`

---

### GET /api/v1/alerts/{id}

**Purpose:** Get full alert detail.
**Auth:** JWT required
**Roles:** All (org-scoped)

**Response `200`:**
```json
{
  "alert_id": "alert_abc123",
  "shipment_id": "SHP-00012",
  "alert_type": "sensor_breach",
  "severity": "critical",
  "status": "open",
  "message": "Temperature exceeded 8°C for 45 minutes.",
  "ml_confidence": 0.91,
  "inference_result": {
    "inference_type": "spoilage",
    "risk_score": 78.2,
    "model_version": "1.3.0"
  },
  "created_at": "2026-02-20T10:10:00Z",
  "updated_at": "2026-02-20T10:10:00Z"
}
```

**DB Operations:**
- `SELECT` → `alerts` JOIN `ml_inference_results`

---

### PATCH /api/v1/alerts/{id}/status

**Purpose:** Acknowledge or resolve an alert.
**Auth:** JWT required
**Roles:** `auditor`, `admin`, `shipper`

**Request:**
```json
{
  "status": "acknowledged",
  "note": "Reviewed by auditor. Cold chain breach confirmed. Escrow flagged."
}
```

**Response `200`:**
```json
{
  "alert_id": "alert_abc123",
  "status": "acknowledged",
  "updated_at": "2026-02-20T11:00:00Z"
}
```

**DB Operations:**
- `UPDATE` → `alerts` (status, updated_at)
- `INSERT` → `audit_logs`

---

### GET /api/v1/alerts/thresholds

**Purpose:** Get current alert threshold configuration.
**Auth:** JWT required
**Roles:** `admin`

**Response `200`:**
```json
{
  "thresholds": [
    {
      "cargo_category": "fresh_produce",
      "alert_type": "sensor_breach",
      "warning_threshold": 50.0,
      "critical_threshold": 75.0
    },
    {
      "cargo_category": null,
      "alert_type": "route_deviation",
      "warning_threshold": 50.0,
      "critical_threshold": 75.0
    }
  ]
}
```

**DB Operations:**
- `SELECT` → `alert_thresholds`
- **Cache:** `alert:thresholds:{cargo_category}` (Redis TTL: 3600s)

---

### PATCH /api/v1/alerts/thresholds/{id}

**Purpose:** Update an alert threshold (admin only).
**Auth:** JWT required
**Roles:** `admin`

**Request:**
```json
{
  "warning_threshold": 45.0,
  "critical_threshold": 70.0
}
```

**Response `200`:** Updated threshold object.

**DB Operations:**
- `UPDATE` → `alert_thresholds`
- **Cache:** `DEL alert:thresholds:{cargo_category}` (invalidate Redis)

---

## 8. Escrow Service

Base path: `/api/v1/escrow`

---

### GET /api/v1/escrow

**Purpose:** Paginated list of escrow agreements for the authenticated org.
**Auth:** JWT required
**Roles:** `financier`, `admin`, `shipper`

**Query Parameters:** `status=initialized|funded|released|disputed&page=1&page_size=20`

**Response `200`:**
```json
{
  "data": [
    {
      "escrow_agreement_id": "esc_001",
      "shipment_id": "SHP-00012",
      "buyer_org_id": "org_buyer_456",
      "seller_org_id": "org_xyz",
      "amount_satoshis": 1500000,
      "status": "funded",
      "ml_risk_score": 42.5,
      "bitcoin_funding_txid": "abc123...",
      "created_at": "2026-02-20T10:00:00Z"
    }
  ],
  "summary": {
    "total_held_satoshis": 5000000,
    "active_disputes": 1,
    "released_count": 12,
    "pending_approval": 3
  }
}
```

**DB Operations:**
- `SELECT` → `escrow_agreements` WHERE `buyer_org_id = JWT.org_id OR seller_org_id = JWT.org_id`

---

### GET /api/v1/escrow/{id}

**Purpose:** Full escrow agreement detail.
**Auth:** JWT required
**Roles:** `financier`, `admin`, `shipper`, `auditor`

**Response `200`:**
```json
{
  "escrow_agreement_id": "esc_001",
  "shipment_id": "SHP-00012",
  "buyer_org": { "id": "org_buyer_456", "legal_name": "London Fresh Ltd" },
  "seller_org": { "id": "org_xyz", "legal_name": "Fresh Farms Pvt Ltd" },
  "amount_satoshis": 1500000,
  "release_conditions": {
    "max_risk_score": 30,
    "require_delivery_confirmation": true
  },
  "status": "funded",
  "bitcoin_funding_txid": "abc123...",
  "bitcoin_release_txid": null,
  "psbt_transactions": [
    {
      "psbt_id": "psbt_001",
      "psbt_type": "funding",
      "status": "broadcast",
      "signatures_collected": 2,
      "signatures_required": 2
    }
  ],
  "created_at": "2026-02-20T10:00:00Z"
}
```

**DB Operations:**
- `SELECT` → `escrow_agreements` JOIN `organizations` JOIN `psbt_transactions`

---

### POST /api/v1/escrow/{id}/psbt/sign

**Purpose:** Submit partial PSBT signature for escrow funding or release.
**Auth:** JWT required
**Roles:** `shipper`, `financier`, `admin` (role must match signer_role)

**Request:**
```json
{
  "signer_role": "buyer",
  "partial_signature": "cHNidP8BAH...base64_encoded_psbt_with_partial_sig"
}
```

**Response `200`:**
```json
{
  "psbt_id": "psbt_001",
  "signatures_collected": 1,
  "signatures_required": 2,
  "status": "partially_signed",
  "threshold_met": false
}
```

**Response `200` (threshold met):**
```json
{
  "psbt_id": "psbt_001",
  "signatures_collected": 2,
  "signatures_required": 2,
  "status": "broadcast",
  "threshold_met": true,
  "txid": "bitcoin_txid_hex"
}
```

**DB Operations:**
- `SELECT` → `psbt_transactions` (validate signer role and org)
- `UPDATE` → `psbt_transactions` (signatures JSONB, psbt_base64, status)
- `UPDATE` → `escrow_agreements` (status → `funded` or `released`, txid)

**Events Published:** `escrow.settled` (if threshold met)

**Business Logic:**
1. Validate JWT `org_id` matches `buyer_org_id` or `seller_org_id` in `escrow_agreements`
2. Validate `signer_role` matches JWT `role`
3. Validate partial PSBT signature correctness via Crypto Service (mTLS call)
4. Store partial sig in `psbt_transactions.signatures JSONB`
5. Merge partial sig into `psbt_base64`
6. If 2-of-3 threshold met: call Crypto Service `finalize_psbt()` → broadcast → store `txid`
7. Publish `escrow.settled`

---

### POST /api/v1/escrow/{id}/release

**Purpose:** Initiate escrow release when delivery conditions are met.
**Auth:** JWT required
**Roles:** `buyer` (shipper role who deposited), `financier`, `admin`

**Request:**
```json
{
  "delivery_confirmation": true,
  "release_note": "Delivery confirmed. ML risk score within threshold."
}
```

**Response `202`:**
```json
{
  "escrow_agreement_id": "esc_001",
  "status": "release_initiated",
  "release_psbt_id": "psbt_002",
  "message": "Release PSBT created. Awaiting 2-of-3 signatures."
}
```

**DB Operations:**
- `SELECT` → `escrow_agreements`, `alerts` (check no open critical alerts)
- `SELECT` → `ml_inference_results` (check risk score ≤ max_risk_score)
- `INSERT` → `psbt_transactions` (psbt_type=`release`, status=`pending`)

**Business Logic:**
1. `ReleaseConditionEvaluator`: verify `ml_risk_score ≤ release_conditions.max_risk_score`
2. Verify no open `CRITICAL` alerts for this shipment
3. Verify `delivery_confirmation = true` if required by conditions
4. Call Crypto Service to construct release PSBT
5. Platform auto-signs as first signer (Vault-managed key)
6. Return release PSBT for buyer second signature

---

### POST /api/v1/escrow/{id}/dispute

**Purpose:** Open a dispute on an escrow agreement.
**Auth:** JWT required
**Roles:** `financier`, `buyer`, `admin`

**Request:**
```json
{
  "reason": "Spoilage detected. ML risk score exceeded threshold.",
  "evidence_s3_key": "origin-proofs/SHP-00012/evidence_01.pdf"
}
```

**Response `200`:**
```json
{
  "escrow_agreement_id": "esc_001",
  "status": "disputed",
  "dispute_id": "disp_001"
}
```

**DB Operations:**
- `UPDATE` → `escrow_agreements` (status=`disputed`)
- `INSERT` → `audit_logs`

**Events Published:** `escrow.disputed`

---

## 9. Crypto Service

Base path: `/api/v1/crypto` (internal endpoints via mTLS; public endpoints via JWT)

---

### GET /api/v1/crypto/merkle/{shipment_id}/proof

**Purpose:** Get Merkle inclusion proof for a shipment's leaf hash.
**Auth:** JWT required
**Roles:** All

**Response `200`:**
```json
{
  "shipment_id": "SHP-00012",
  "leaf_hash": "a3f4c2d1e5b8f9a0...",
  "merkle_root": "f9a3b2c1d4e5f6a7...",
  "proof_path": [
    "sibling_hash_1_hex",
    "sibling_hash_2_hex",
    "sibling_hash_3_hex"
  ],
  "tree_id": "tree_uuid",
  "bitcoin_commitment": {
    "txid": "btc_txid_hex",
    "block_height": 2834512,
    "block_hash": "block_hash_hex",
    "network": "testnet",
    "confirmed_at": "2026-02-20T10:30:00Z"
  },
  "committed": true
}
```

**DB Operations:**
- `SELECT` → `merkle_leaves` JOIN `merkle_trees` JOIN `bitcoin_commitments`

---

### GET /api/v1/crypto/bitcoin/{shipment_id}/commitment

**Purpose:** Get Bitcoin OP_RETURN commitment for a shipment's Merkle root.
**Auth:** JWT required
**Roles:** All

**Response `200`:**
```json
{
  "shipment_id": "SHP-00012",
  "merkle_root": "f9a3b2c1...",
  "txid": "btc_txid_hex",
  "block_height": 2834512,
  "block_hash": "block_hash_hex",
  "network": "testnet",
  "op_return_data": "6a20f9a3b2c1...",
  "confirmed_at": "2026-02-20T10:30:00Z"
}
```

**DB Operations:**
- `SELECT` → `merkle_leaves` JOIN `merkle_trees` JOIN `bitcoin_commitments`

---

### POST /api/v1/crypto/merkle/commit [INTERNAL]

**Purpose:** Build Merkle tree from a batch of leaf hashes. Called internally by Rust scheduler.
**Auth:** mTLS only — not exposed via API Gateway
**Roles:** Internal scheduler only

**Request:**
```json
{
  "batch_id": "batch_uuid",
  "leaf_hashes": ["a3f4c2...", "b5d3e1...", "c7a8f9..."]
}
```

**Response `200`:**
```json
{
  "merkle_root": "f9a3b2c1...",
  "commitment_id": "cmmt_001",
  "leaf_count": 3,
  "proof_paths": {
    "a3f4c2...": ["sibling_1", "sibling_2"],
    "b5d3e1...": ["sibling_1", "sibling_3"]
  }
}
```

**Events Published:** `merkle.committed`, `bitcoin.anchored` (async after confirmation)

---

### POST /api/v1/crypto/merkle/leaf [INTERNAL]

**Purpose:** Compute and persist a single Merkle leaf hash for a shipment event.
**Auth:** mTLS only
**Roles:** Shipment Service only

**Request:**
```json
{
  "shipment_id": "SHP-00012",
  "event_type": "shipment_created",
  "event_payload": {
    "origin_port": "INBOM",
    "destination_port": "GBLON",
    "cargo_category": "fresh_produce",
    "timestamp": "2026-02-20T10:00:00Z"
  }
}
```

**Response `200`:**
```json
{
  "leaf_hash": "a3f4c2d1e5b8f9a0...",
  "leaf_id": "leaf_uuid"
}
```

**DB Operations:**
- `INSERT` → `merkle_leaves` (committed=false)

---

## 10. Audit Service

Base path: `/api/v1/audit`

> The Audit Service primarily operates as a Kafka consumer. It exposes read-only query APIs for authorized roles.

---

### GET /api/v1/audit/logs

**Purpose:** Query the immutable audit log (append-only).
**Auth:** JWT required
**Roles:** `auditor`, `admin`

**Query Parameters:**
```
entity_type=shipment&entity_id=SHP-00012
source_service=shipment_service
event_type=shipment.created
from=2026-02-01T00:00:00Z&to=2026-02-28T23:59:59Z
page=1&page_size=50
```

**Response `200`:**
```json
{
  "data": [
    {
      "log_id": "log_uuid",
      "event_type": "shipment.created",
      "source_service": "shipment_service",
      "entity_type": "shipment",
      "entity_id": "SHP-00012",
      "actor_user_id": "usr_abc123",
      "payload": { "status": "active", "cargo_category": "fresh_produce" },
      "timestamp": "2026-02-20T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "page_size": 50, "total": 243, "has_more": true }
}
```

**DB Operations:**
- `SELECT` → `audit_logs` (read-only; RLS enforced — no UPDATE/DELETE possible)

---

## 11. Reporting Service

Base path: `/api/v1/reports`

---

### GET /api/v1/reports/shipments/summary

**Purpose:** Aggregate shipment summary report for org dashboard.
**Auth:** JWT required
**Roles:** `admin`, `auditor`, `financier`

**Query Parameters:** `from=2026-01-01&to=2026-02-28&cargo_category=fresh_produce`

**Response `200`:**
```json
{
  "total_shipments": 142,
  "by_status": {
    "active": 23,
    "in_transit": 41,
    "delivered": 71,
    "disputed": 7
  },
  "avg_ml_risk_score": 31.4,
  "high_risk_shipments": 12,
  "total_escrow_satoshis": 45000000,
  "fraud_alerts_raised": 18,
  "period_from": "2026-01-01",
  "period_to": "2026-02-28"
}
```

**DB Operations:**
- `SELECT` aggregations → `shipments`, `alerts`, `escrow_agreements` (read-only)

---

### GET /api/v1/reports/participants/risk

**Purpose:** Report of participant risk scores across the org's supply chain.
**Auth:** JWT required
**Roles:** `auditor`, `admin`

**Response `200`:**
```json
{
  "data": [
    {
      "org_id": "org_carrier_123",
      "legal_name": "Fast Logistics Ltd",
      "risk_score": 22.5,
      "score_date": "2026-02-20",
      "high_risk": false
    }
  ]
}
```

**DB Operations:**
- `SELECT` → `participant_risk_scores` JOIN `organizations`

---

### GET /api/v1/reports/ml/model-performance

**Purpose:** Model performance metrics for active ML models.
**Auth:** JWT required
**Roles:** `admin`

**Response `200`:**
```json
{
  "models": [
    {
      "model_type": "isolation_forest",
      "version_tag": "1.3.0",
      "is_active": true,
      "total_inferences": 14823,
      "avg_risk_score": 28.4,
      "anomaly_flag_rate_pct": 4.2,
      "deployed_at": "2026-02-01T00:00:00Z"
    }
  ]
}
```

**DB Operations:**
- `SELECT` → `model_versions` JOIN `ml_inference_results`

---

## 12. Service-to-Service Internal APIs

> All internal APIs use **mTLS** (mutual TLS) between services within the Kubernetes cluster. These endpoints are **not exposed** through the API Gateway. Traffic is restricted to the `origin-internal` Kubernetes service network namespace.

---

### Shipment Service → ML Service

**POST /internal/ml/risk/precheck**

Called during shipment creation for synchronous pre-check (timeout: 5s).

```json
// Request
{
  "origin_port": "INBOM",
  "destination_port": "GBLON",
  "carrier_org_id": "org_carrier_123",
  "cargo_category": "fresh_produce",
  "estimated_departure": "2026-03-01T06:00:00Z"
}

// Response
{
  "risk_score": 18.5,
  "confidence": 0.91,
  "model_version": "1.3.0"
}
```

---

### Shipment Service → Crypto Service

**POST /internal/crypto/merkle/leaf**

Called during shipment creation to compute and persist Merkle leaf hash.

```json
// Request
{
  "shipment_id": "SHP-00012",
  "event_type": "shipment_created",
  "event_payload": { "origin_port": "INBOM", "timestamp": "2026-02-20T10:00:00Z" }
}

// Response
{
  "leaf_hash": "a3f4c2d1...",
  "leaf_id": "leaf_uuid"
}
```

---

### Shipment Service → Escrow Service

**POST /internal/escrow/init**

Called during shipment creation to initialize escrow agreement.

```json
// Request
{
  "shipment_id": "SHP-00012",
  "buyer_org_id": "org_buyer_456",
  "seller_org_id": "org_xyz",
  "amount_satoshis": 1500000,
  "release_conditions": {
    "max_risk_score": 30,
    "require_delivery_confirmation": true
  }
}

// Response
{
  "escrow_agreement_id": "esc_001",
  "status": "initialized"
}
```

---

### Escrow Service → Crypto Service

**POST /internal/crypto/psbt/validate-signature**

Called during PSBT signing to validate partial signature.

```json
// Request
{
  "psbt_base64": "cHNidP8BAH...",
  "partial_signature": "cHNidP8BAH...with_sig",
  "signer_public_key": "02abc123..."
}

// Response
{
  "valid": true,
  "error": null
}
```

**POST /internal/crypto/psbt/finalize**

Called when 2-of-3 signature threshold is met.

```json
// Request
{
  "psbt_id": "psbt_001",
  "psbt_base64_with_all_sigs": "cHNidP8BAH..."
}

// Response
{
  "txid": "bitcoin_txid_hex",
  "broadcast_at": "2026-02-20T10:30:00Z"
}
```

---

### ML Service → Alert Service (via Kafka — see Section 13)

> The ML Service does NOT call Alert Service directly via HTTP. It publishes `ml.inference.completed` to Kafka, which Alert Service consumes asynchronously.

---

### IoT Ingestion Service → ML Service (via Kafka — see Section 13)

> IoT Ingestion publishes `sensor.ingested` to Kafka. ML Service consumes it asynchronously.

---

## 13. Event-Driven API Contracts (Kafka)

**Global Kafka Configuration:**
- `acks=all` · `enable.idempotence=true` · `compression.type=lz4`
- All consumer groups: manual offset commit (at-least-once delivery)
- Idempotency: all consumers deduplicate on `event_id` before processing
- Retry: 3 retries with exponential backoff (1s → 2s → 4s) before DLQ routing
- DLQ retention: 30 days · Business topic retention: 7 days (sensor: 1 day)

---

### Topic: `shipment.created`

**Partitions:** 6 · **Key:** `shipment_id` · **Retention:** 7 days

**Producer:** Shipment Service

**Consumers:** ML Service, Crypto Service, Audit Service

**Message Schema:**
```json
{
  "event_id": "evt_uuid_v4",
  "event_type": "shipment.created",
  "timestamp": "2026-02-20T10:00:00Z",
  "producer_service": "shipment_service",
  "schema_version": "1.0",
  "payload": {
    "shipment_id": "SHP-00012",
    "org_id": "org_xyz",
    "carrier_org_id": "org_carrier_123",
    "buyer_org_id": "org_buyer_456",
    "origin_port": "INBOM",
    "destination_port": "GBLON",
    "cargo_category": "fresh_produce",
    "weight_kg": 500.0,
    "status": "active",
    "ml_precheck_score": 18.5,
    "merkle_leaf_hash": "a3f4c2...",
    "created_at": "2026-02-20T10:00:00Z"
  }
}
```

**Consumer Actions:**
- **ML Service:** Schedule full inference pipeline (all 4 inference types)
- **Crypto Service:** Record shipment in Merkle leaf queue
- **Audit Service:** `INSERT audit_logs` (event_type: `shipment.created`)

**DLQ:** `dlq.shipment.created`

---

### Topic: `sensor.ingested`

**Partitions:** 12 · **Key:** `device_id` · **Retention:** 1 day

**Producer:** IoT Ingestion Service

**Consumers:** ML Service

**Message Schema:**
```json
{
  "event_id": "evt_uuid_v4",
  "event_type": "sensor.ingested",
  "timestamp": "2026-02-20T10:05:00Z",
  "producer_service": "iot_ingestion_service",
  "schema_version": "1.0",
  "payload": {
    "device_id": "dev_001",
    "shipment_id": "SHP-00012",
    "batch_id": "batch_uuid",
    "reading_count": 2,
    "time_range_from": "2026-02-20T10:04:00Z",
    "time_range_to": "2026-02-20T10:06:00Z"
  }
}
```

**Consumer Actions:**
- **ML Service:** Query TimescaleDB for last 60 readings → run IsolationForest + LSTM inference

**DLQ:** `dlq.sensor.ingested`

---

### Topic: `custody.handoff`

**Partitions:** 6 · **Key:** `shipment_id` · **Retention:** 7 days

**Producer:** Shipment Service

**Consumers:** ML Service, Crypto Service, Audit Service

**Message Schema:**
```json
{
  "event_id": "evt_uuid_v4",
  "event_type": "custody.handoff",
  "timestamp": "2026-02-25T08:00:00Z",
  "producer_service": "shipment_service",
  "schema_version": "1.0",
  "payload": {
    "custody_event_id": "cust_abc123",
    "shipment_id": "SHP-00012",
    "custodian_org_id": "org_carrier_123",
    "event_type": "handoff",
    "gps_latitude": 18.9667,
    "gps_longitude": 72.8333,
    "event_hash": "sha256_hex",
    "previous_event_hash": "sha256_hex",
    "timestamp": "2026-02-25T08:00:00Z"
  }
}
```

**Consumer Actions:**
- **ML Service:** Re-run GNN route deviation + provenance inference
- **Crypto Service:** Add custody event to Merkle leaf queue
- **Audit Service:** `INSERT audit_logs`

---

### Topic: `ml.inference.completed`

**Partitions:** 6 · **Key:** `shipment_id` · **Retention:** 7 days

**Producer:** ML Service

**Consumers:** Alert Service, Shipment Service

**Message Schema:**
```json
{
  "event_id": "evt_uuid_v4",
  "event_type": "ml.inference.completed",
  "timestamp": "2026-02-20T10:02:00Z",
  "producer_service": "ml_service",
  "schema_version": "1.0",
  "payload": {
    "inference_result_id": "result_uuid",
    "shipment_id": "SHP-00012",
    "inference_type": "spoilage",
    "risk_score": 78.2,
    "confidence": 0.91,
    "anomaly_flag": true,
    "model_version": "1.3.0",
    "features_snapshot": {
      "cumulative_exposure": 28.4,
      "rate_of_temperature_change": 0.48
    },
    "computed_at": "2026-02-20T10:02:00Z"
  }
}
```

**Consumer Actions:**
- **Alert Service:** Evaluate thresholds → create alert if score ≥ warning threshold
- **Shipment Service (MLResultHandler):** `SET ml:score:{shipment_id}` in Redis; `UPDATE shipments.ml_risk_score`

---

### Topic: `alert.created`

**Partitions:** 3 · **Key:** `shipment_id` · **Retention:** 7 days

**Producer:** Alert Service

**Consumers:** Escrow Service, Audit Service

**Message Schema:**
```json
{
  "event_id": "evt_uuid_v4",
  "event_type": "alert.created",
  "timestamp": "2026-02-20T10:02:30Z",
  "producer_service": "alert_service",
  "schema_version": "1.0",
  "payload": {
    "alert_id": "alert_abc123",
    "shipment_id": "SHP-00012",
    "alert_type": "sensor_breach",
    "severity": "critical",
    "ml_confidence": 0.91,
    "risk_score": 78.2,
    "message": "Temperature exceeded 8°C for 45 minutes."
  }
}
```

**Consumer Actions:**
- **Escrow Service (AlertConsumer):** If `severity=critical` → `UPDATE escrow_agreements.status = flagged_for_review`
- **Audit Service:** `INSERT audit_logs`

---

### Topic: `escrow.created`

**Partitions:** 3 · **Key:** `escrow_id` · **Retention:** 7 days

**Producer:** Escrow Service

**Consumers:** Crypto Service, Audit Service

**Message Schema:**
```json
{
  "event_id": "evt_uuid_v4",
  "event_type": "escrow.created",
  "timestamp": "2026-02-20T10:00:10Z",
  "producer_service": "escrow_service",
  "schema_version": "1.0",
  "payload": {
    "escrow_agreement_id": "esc_001",
    "shipment_id": "SHP-00012",
    "buyer_org_id": "org_buyer_456",
    "seller_org_id": "org_xyz",
    "amount_satoshis": 1500000,
    "release_conditions": { "max_risk_score": 30, "require_delivery_confirmation": true }
  }
}
```

**Consumer Actions:**
- **Crypto Service:** Fetch buyer/seller public keys from `wallet_keys` → construct 2-of-3 P2WSH PSBT → `INSERT psbt_transactions`

---

### Topic: `escrow.settled`

**Partitions:** 3 · **Key:** `escrow_id` · **Retention:** 7 days

**Producer:** Escrow Service

**Consumers:** Audit Service

**Message Schema:**
```json
{
  "event_id": "evt_uuid_v4",
  "event_type": "escrow.settled",
  "timestamp": "2026-03-10T15:00:00Z",
  "producer_service": "escrow_service",
  "schema_version": "1.0",
  "payload": {
    "escrow_agreement_id": "esc_001",
    "shipment_id": "SHP-00012",
    "settlement_type": "release",
    "bitcoin_release_txid": "btc_txid_hex",
    "amount_satoshis": 1500000,
    "settled_at": "2026-03-10T15:00:00Z"
  }
}
```

---

### Topic: `merkle.committed`

**Partitions:** 1 · **Key:** `tree_id` · **Retention:** 7 days (ordered semantics)

**Producer:** Crypto Service

**Consumers:** Shipment Service, Audit Service

**Message Schema:**
```json
{
  "event_id": "evt_uuid_v4",
  "event_type": "merkle.committed",
  "timestamp": "2026-02-20T10:10:00Z",
  "producer_service": "crypto_service",
  "schema_version": "1.0",
  "payload": {
    "tree_id": "tree_uuid",
    "merkle_root": "f9a3b2c1...",
    "leaf_count": 12,
    "shipment_ids": ["SHP-00012", "SHP-00013"],
    "commitment_timestamp": "2026-02-20T10:10:00Z"
  }
}
```

**Consumer Actions:**
- **Shipment Service (MerkleStatusHandler):** `UPDATE shipment_events SET bitcoin_committed=true WHERE shipment_id IN (payload.shipment_ids)`

---

### Topic: `bitcoin.anchored`

**Partitions:** 1 · **Key:** `tree_id` · **Retention:** 7 days (ordered semantics)

**Producer:** Crypto Service

**Consumers:** Audit Service

**Message Schema:**
```json
{
  "event_id": "evt_uuid_v4",
  "event_type": "bitcoin.anchored",
  "timestamp": "2026-02-20T10:30:00Z",
  "producer_service": "crypto_service",
  "schema_version": "1.0",
  "payload": {
    "commitment_id": "cmmt_001",
    "tree_id": "tree_uuid",
    "merkle_root": "f9a3b2c1...",
    "txid": "btc_txid_hex",
    "block_height": 2834512,
    "block_hash": "block_hash_hex",
    "network": "testnet",
    "confirmed_at": "2026-02-20T10:30:00Z"
  }
}
```

---

### Topic: `kyc.submitted`

**Partitions:** 3 · **Key:** `user_id` · **Retention:** 7 days

**Producer:** Auth Service

**Consumers:** ML Service, Audit Service

**Message Schema:**
```json
{
  "event_id": "evt_uuid_v4",
  "event_type": "kyc.submitted",
  "timestamp": "2026-02-20T09:00:00Z",
  "producer_service": "auth_service",
  "schema_version": "1.0",
  "payload": {
    "kyc_record_id": "kyc_abc123",
    "user_id": "usr_abc123",
    "org_id": "org_xyz",
    "document_type": "business_license",
    "s3_document_key": "origin-kyc/usr_abc123/business_license_001.pdf"
  }
}
```

**Consumer Actions:**
- **ML Service:** Run OCR + document authenticity scoring; update `kyc_records.status`

---

*End of API Contracts — Origin v1.0 | February 2026*
*All contracts are implementation-ready for backend and frontend engineering teams.*
