# Origin – JSON Mock Layer: Design Guide
## Agricultural Supply Chain Fraud Detection System

---

## Why This Mock Layer Exists

The Origin system's blockchain infrastructure (Merkle commitments, Bitcoin anchoring, PSBT
escrow) is deferred from the prototype. Rather than hollowing out the system's design, this
mock layer preserves the **exact same field structure** that the real blockchain layer will
eventually produce.

The core principle: **every simulated field is tagged, isolated, and swappable.**
A future engineer can replace `layer_mode: "mock"` with `"testnet"` or `"mainnet"` and
substitute real computed values without touching any other part of the system.

---

## Section-by-Section Breakdown

---

### 1. `shipment_id` + `schema_version`

```json
"shipment_id": "a3f7c291-4e2b-4d1a-8b3e-7c6f2a91d045",
"schema_version": "1.0.0"
```

**Purpose:** The `shipment_id` is a UUID v4 — globally unique, collision-resistant, and
safe for distributed systems (no central counter needed). It is the primary key in
PostgreSQL and the identifier used across all APIs, dashboards, and escrow references.

`schema_version` enables future migrations. When the blockchain layer goes live and adds
new fields, bump to `"2.0.0"` and let consumers handle version negotiation gracefully.

---

### 2. `product`

**Purpose:** Describes what is physically being tracked. `batch_id` is the traceability
anchor — it links this shipment to laboratory test records, harvest logs, and retailer
barcodes. `expected_shelf_life_days` feeds directly into the spoilage ML model to
calibrate risk thresholds dynamically per product.

**Forward compatibility:** No blockchain-specific fields here. This section is stable.

---

### 3. `provenance`

**Purpose:** Captures the claimed geographic origin of the product. `provenance_verified`
is set by the provenance classification ML model (supervised/ensemble). The
`claimed_origin_label` is what the farmer/seller declares — the ML model's job is to
validate it against sensor fingerprints, chemical analysis, and historical patterns.

The `cooperative_id` enables graph-based participant risk scoring (GNN model), since
cooperatives often act as consolidation points for fraud.

---

### 4. `events[]` — The Core Event Log

**Purpose:** An ordered, tamper-evident log of every supply chain event from harvest to
delivery. Each event is a discrete record that will become a **Merkle tree leaf** in
production.

Key design decisions:

| Field | Role |
|---|---|
| `sequence_number` | Monotonically increasing; detects missing or inserted events |
| `actor.risk_score` | Real-time GNN risk score for this participant |
| `sensor_reading` | Raw environmental data at the moment of the event |
| `event_hash` | SHA-256 of canonical JSON of this event (mock: pre-computed string) |
| `previous_event_hash` | Links events into a hash chain — tamper breaks the chain |

**The hash chain** (`event_hash` → `previous_event_hash`) is the key forward-compatibility
mechanism. In the mock layer, these are static hex strings. In production, the Merkle
builder service computes them deterministically from the canonical JSON of each event.
The chain structure means any retrospective modification of an event invalidates all
subsequent hashes — making tampering detectable without full blockchain infrastructure.

**`sensor_verified: false`** on events like `certification_issued` signals that no IoT
sensor was present — this is intentional and expected. Auditors can filter for events
where `sensor_verified: true` is expected but missing.

---

### 5. `sensor_summary`

**Purpose:** Aggregated statistics over the entire journey, used by the dashboard and
ML models for at-a-glance risk assessment. These are **derived/engineered features**
matching the PRD's feature engineering specification:

| Summary Field | PRD Feature |
|---|---|
| `cumulative_exposure_score` | Cumulative exposure |
| `rate_of_temp_change_avg` | Rate of temperature change |
| `cold_chain_break_count` | Handling violation score (proxy) |

These are pre-computed by the feature pipeline and stored here to avoid real-time
recomputation on every API call. The ML engine populates these fields.

---

### 6. `fraud_assessment`

**Purpose:** The output of the full ML fraud detection suite. This section is the
primary payload consumed by buyer and auditor dashboards.

Sub-fields map to specific models from the PRD:

| Score | Model(s) |
|---|---|
| `spoilage_risk.score` | Isolation Forest + LSTM Autoencoder |
| `tampering_score.score` | Benford's Law + ARIMA residual analysis |
| `route_deviation_score.score` | Graph Neural Network + LSTM timing |
| `provenance_confidence.score` | Supervised/ensemble classifiers |
| `participant_risk_score` | GNN over participant graph |

**`overall_risk_score`** is a weighted ensemble of the above, computed by the risk
aggregation layer. `risk_level` is a human-readable bucketing of the score:
- `low`: 0.0–0.25
- `medium`: 0.25–0.50
- `high`: 0.50–0.75
- `critical`: 0.75–1.0

**`requires_human_review`** is a binary flag that triggers the human-in-the-loop
workflow described in the PRD's risk mitigation table. When `true`, the escrow
release is blocked until an auditor manually approves.

**`explainability`** contains SHAP feature importance values. This directly satisfies
the PRD's "Explainability & Trust" requirement. The `direction` field tells a buyer
whether a feature increased or decreased their shipment's risk — plain-language audit
trail without requiring ML expertise.

---

### 7. `cryptographic_layer` — The Mock Blockchain Layer

**Purpose:** This is the central mock section. It exactly mirrors what the real Merkle
+ Bitcoin infrastructure will produce, enabling the rest of the system to function as
if blockchain were live.

**`layer_mode`** is the master switch:
```
"mock"     → values are simulated (current prototype state)
"testnet"  → real Bitcoin testnet txids and Merkle proofs
"mainnet"  → production anchoring
```

Sub-section breakdown:

#### `event_hashes[]`
An ordered list of SHA-256 hashes — one per event, in `sequence_number` order.
These are the **leaves** of the Merkle tree. In mock mode, these match the
`event_hash` fields in each event record. In production, the Merkle builder service
reads all events, computes canonical JSON, hashes them, and populates this array.

#### `batch_hash`
SHA-256 of the concatenation of all event hashes. Serves as a fast-path integrity
check: a single hash comparison tells you whether any event in the shipment was
modified.

#### `merkle_root`
The root of the Merkle tree built from `event_hashes`. In production:
1. Merkle builder computes the root
2. Root is embedded into a Bitcoin OP_RETURN transaction
3. `bitcoin_anchor_txid` references that transaction
4. Anyone with the root and any `event_hash` can verify inclusion via `merkle_path`

#### `bitcoin_anchor`
```json
"op_return_data": "4f524947494e{merkle_root_hex}"
```
The `op_return_data` format is `ORIGIN` (ASCII hex: `4f524947494e`) followed by
the 32-byte merkle_root. This is the exact format the Bitcoin anchoring module
will write. `block_height` and `confirmations` are `null` in mock mode — they
become populated when a real transaction confirms.

#### `commitment_proof` (Merkle inclusion proof)
The `merkle_path` array is a list of sibling hashes + directions from any leaf to
the root. An auditor (or the verification dashboard) can:
1. Hash the target event's canonical JSON
2. Walk the `merkle_path` applying sibling hashes left or right
3. Arrive at the `merkle_root`
4. Confirm the root matches the `bitcoin_anchor_txid`'s OP_RETURN payload

`verification_url` points to the public verifier endpoint — auditors click this
link to verify without understanding cryptography.

---

### 8. `escrow` — Mock PSBT Settlement

**Purpose:** Simulates the PSBT multisig escrow lifecycle. The state machine is:

```
not_initiated → pending → funded → conditions_met → released
                                  ↘ disputed → refunded
```

**`escrow_psbt_id`** holds a truncated PSBT string prefix in mock mode. In
production, this is a full base64-encoded PSBT that any participant can partially
sign using Bitcoin Core or a hardware wallet.

**`multisig_participants`** implements m-of-n signing:
- `required_signatures: 2` (buyer + seller = 2-of-3, arbiter only needed in dispute)
- `mock_public_key` is a 33-byte compressed EC public key placeholder
- In production, replace with real xpubs from participant wallets

**`release_conditions`** are machine-evaluable pre-conditions. The escrow engine
evaluates each condition against live system data:
- `fraud_score_below` → reads `fraud_assessment.overall_risk_score`
- `delivery_confirmed` → checks for a `delivery` event in the event log
- `cert_verified` → checks `certification.certifications[].verified`
- `manual_approval` → waits for auditor sign-off in the dashboard

In the example, `COND-004` is unmet — there is an unresolved cold-chain breach alert
requiring auditor review. The escrow state is therefore `conditions_met` (most
conditions pass) but `released_at` remains null. This drives the dashboard to show
a "pending auditor review" status to the buyer.

---

### 9. `certification`

**Purpose:** All certifications relevant to this shipment. `cert_hash` is SHA-256 of
the certificate document — allows auditors to verify they have the genuine certificate,
not a substituted document. `verification_method: "api_lookup"` means the system
verified the cert ID against the issuing body's live API. `"mock"` would indicate
a simulated check during testing.

---

### 10. `metadata`

**Purpose:** System-level fields for API routing, RBAC, and auditability.

`accessible_to` drives role-based access control at the API gateway:
- Farmers see provenance + events only
- Buyers see fraud_assessment + escrow + certifications
- Auditors see everything including `cryptographic_layer`
- Regulators get a read-only view of the full record

`record_status: "under_review"` signals active workflows and prevents the record
from being archived until all alerts are resolved.

---

## Replacing Mock Fields With Real Blockchain Outputs

The transition from mock to real is surgical:

```
Step 1: Set layer_mode to "testnet" or "mainnet"
Step 2: Merkle builder service computes event_hashes[], batch_hash, merkle_root
Step 3: Bitcoin anchoring service broadcasts OP_RETURN tx → populates bitcoin_anchor_txid,
        block_height, block_hash, confirmations
Step 4: Merkle proof service generates real merkle_path for commitment_proof
Step 5: PSBT escrow engine replaces escrow_psbt_id with real base64 PSBT string
        and replaces mock_public_key with real participant xpubs
```

**Nothing else in the system changes.** The ML engine, API layer, dashboards, and
verification tools all consume the same field paths — only the values change from
simulated to cryptographically real.

---

## Database Storage Notes

Store this document as:
- **Primary record:** PostgreSQL JSONB column (indexed on `shipment_id`, `fraud_assessment.risk_level`, `escrow.escrow_state`)
- **Event log:** Decompose `events[]` into a `shipment_events` table (foreign key: `shipment_id`) for time-series queries via TimescaleDB
- **Sensor summary:** Materialised view over `shipment_events` sensor readings
- **Fraud assessments:** Separate `fraud_assessments` table with FK to `shipment_id` (allows versioned re-assessment)
- **Crypto layer:** Separate `crypto_commitments` table (swapped out wholesale when blockchain goes live)

---

## API Exposure Notes

| Endpoint | Payload | Consumers |
|---|---|---|
| `GET /shipments/{id}` | Full document (RBAC filtered) | All |
| `GET /shipments/{id}/events` | `events[]` only | Auditors, logistics |
| `GET /shipments/{id}/fraud` | `fraud_assessment` | Buyers, auditors |
| `GET /shipments/{id}/proof` | `cryptographic_layer` | Auditors, regulators |
| `GET /shipments/{id}/escrow` | `escrow` | Buyers, sellers |
| `POST /shipments/{id}/events` | Single event record | Logistics actors |
| `PUT /shipments/{id}/escrow/release` | Trigger release | Buyers + arbiter |
