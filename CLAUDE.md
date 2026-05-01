# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a polyglot monorepo for **Origin**, an agricultural supply chain fraud-detection platform.

- `services/` — backend microservices (8 FastAPI/Python services + 1 Rust service)
- `apps/web-app/` — Next.js 16 (App Router, React 19, Tailwind v4) operator dashboard
- `apps/mobile-app/` — Flutter app (custodian handoffs with offline ECDSA signing)
- `infra/` — Terraform (AWS), Kubernetes manifests, SQL migrations, Vault policies, Locust load tests
- `Dataset/` — `clean_dataset.csv(.gz)` consumed by the web-app build step (raw CSV is gitignored; `.csv.gz` is committed)
- `docker-compose.yml` — full local stack (Postgres/Timescale, Redis, Kafka, Nginx gateway, all services)
- `nginx.conf` — API gateway: routes `/api/v1/{auth,users,shipments,iot,ml,alerts,escrow,audits}` to the matching service
- `BUILD_EXECUTION_PLAN.md` / `MAINNET_MIGRATION.md` — phased build sequence and Bitcoin mainnet cutover runbook

## Common commands

### Web app (`apps/web-app/`)

```bash
npm run dev       # Next dev server on :3000
npm run build     # Runs scripts/build-dataset.mjs FIRST, then next build (prebuild hook)
npm run lint      # eslint
```

The build step (`scripts/build-dataset.mjs`) is load-bearing: it reads `Dataset/clean_dataset.csv(.gz)` and writes pre-paginated static JSON to `public/data/{shipments,alerts,escrows,audits}/{filter}/{page}.json` plus `stats.json`. The web app reads these from CDN in static-data mode — it does **not** require a running backend by default. To target a live backend instead, set `NEXT_PUBLIC_USE_STATIC_DATA=false` and `NEXT_PUBLIC_API_URL` (see `src/lib/api.ts`).

### Backend services

```bash
docker compose up           # Full stack: gateway on :80, services on :8001-:8008
docker compose up postgres redis kafka   # Just infra (run a service locally against it)
```

Each Python service is a self-contained FastAPI app (its own `requirements.txt`, `Dockerfile`, `tests/`). To run one service's tests, `cd` into that service so its top-level modules (`main`, `database`, `models`, `schemas`, `core/`) are importable:

```bash
cd services/auth-service && pytest                    # all tests for a service
cd services/auth-service && pytest tests/test_auth.py::test_login_success   # single test
```

Test files at `services/<svc>/tests/test_*.py` mock `asyncpg`/`psycopg2` at import time (see `tests/test_auth.py:1-4`) so they run without a live DB. Don't remove those mocks unless you're switching to integration tests against the compose stack.

The Rust `crypto-service`: `cd services/crypto-service && cargo build && cargo test`.

### Mobile app

```bash
cd apps/mobile-app
flutter pub get
flutter run            # device/emulator
flutter test           # widget tests
```

### Load testing (`load-testing/` and `infra/testing/`)

```bash
cd load-testing && pip install -r requirements.txt
locust -f locustfile.py --host=http://localhost:8004                        # IoT ingestion (interactive UI)
locust -f locustfile.py --host=http://localhost:8004 --headless -u 1000 -r 100 --run-time 1m
```

## Architecture

### Event-driven microservices, sequenced by data dependency

The build order in `BUILD_EXECUTION_PLAN.md` reflects a real runtime data dependency, not just a planning convenience:

```
Auth/User  →  Shipment + IoT (producers)  →  ML (consumer + producer)  →  Alert (consumer)  →  Escrow (consumer)
                                                                                                  ↑
                                              Crypto Service (Rust, async Bitcoin anchoring) ─────┘
                                              Audit/Reporting (sinks ALL Kafka topics)
```

Kafka topics carry the contract between services. Notable events: `shipment.created`, `custody.handoff`, `sensor.ingested`, `ml.inference.completed`, `alert.created`, `merkle.committed`, `bitcoin.anchored`. When adding a new event, both producer and consumer need to land in the same change — there's no schema registry yet.

### Auth model

`auth-service` issues **RS256 JWTs** signed with keys loaded from Vault at startup (falls back to hardcoded dev keys — see `services/auth-service/main.py:60-66`). Other services validate JWTs using the public key via `core/dependencies.py::get_current_user_from_token` and enforce roles via `RoleChecker([UserRole.X, ...])`. The role list is duplicated per service (`services/<svc>/core/dependencies.py`) — keep them in sync.

Lockout, refresh-token blacklist, and login-attempt counters all live in **Redis**. If Redis is unavailable, auth-service degrades gracefully (lockout disabled — see `_check_lockout` returning early when `_redis is None`). Don't treat Redis as a hard dependency for auth.

### Database & RLS

Postgres is **TimescaleDB** (`timescale/timescaledb:latest-pg16` in compose). Migrations are plain SQL in `infra/db/migrations/` — they run in numerical order; `011_hardening_rls.sql` sets up Postgres Row-Level Security keyed on a session variable.

Services that enforce RLS use a custom dependency (e.g. `services/shipment-service/main.py::get_db_with_rls`) that runs `SELECT set_config('app.current_user_id', :user_id, true)` on each session before yielding it. **Always use `get_db_with_rls`, not `get_db`, for endpoints that touch tenant data** — bypassing it silently disables RLS for that request.

Service `database.py` files also call `Base.metadata.create_all` on startup for dev convenience; production relies on the SQL migrations in `infra/db/migrations/`.

### Web app data-fetching

`apps/web-app/src/lib/api.ts` is a single client used in two modes:
- **Static** (default, `NEXT_PUBLIC_USE_STATIC_DATA !== 'false'`): reads `/data/*.json` produced by `scripts/build-dataset.mjs`. Pages are pre-sliced at build time (`PAGE_SIZE = 100`) and served from CDN — zero serverless cost on Vercel.
- **Live**: hits the API gateway at `NEXT_PUBLIC_API_URL` (default `http://localhost/api/v1`).

Mutation endpoints (`createShipment`, `acknowledgeAlert`, `settleEscrow`, etc.) wrap every fetch in a try/catch that returns a synthesized success object on network failure — this keeps demo flows working without a backend. When changing these, preserve that fallback unless explicitly removing demo mode.

### Crypto service (Rust)

`services/crypto-service/` is the only non-Python service. It builds Merkle trees from queued leaves on a Tokio interval, broadcasts `OP_RETURN` anchoring transactions via Bitcoin Core RPC, and handles PSBT (Partially Signed Bitcoin Transactions) for 2-of-3 multisig escrow. RPC config is via env vars (`BITCOIN_RPC_URL/USER/PASS`). Mainnet cutover steps live in `MAINNET_MIGRATION.md`.

## Conventions and gotchas

- **Service naming is inconsistent**: directories use both `kebab-case` (`auth-service`) and `snake_case` (`ml_service`, `alert_service`, `audit_reporting_service`). The CI workflow (`.github/workflows/deploy.yml`) maps directory names to ECR repo names — match its mapping when adding a new service.
- **Two `Dataset/` directories exist**: `Dataset/` at repo root (the canonical location, used by `build-dataset.mjs`'s candidate list) and `infra/Dataset/`. The `.gitignore` allows `*.csv.gz` but ignores `*.csv`.
- **The `_consumer` and `_producer` patterns**: services that consume Kafka spawn the consumer as an `asyncio.create_task` in a FastAPI `lifespan` / `startup` handler (e.g. `services/escrow-service/main.py`). Producers are module-level globals initialized on startup. Both wrap connect/start in try/except so missing Kafka doesn't crash the service in dev.
- **No monorepo task runner**: there's no top-level `Makefile`, `package.json`, or `pnpm-workspace.yaml`. Each service/app is run from its own directory.
