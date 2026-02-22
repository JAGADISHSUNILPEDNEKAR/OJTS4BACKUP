# Hardening: Penetration Testing & Security Audit

This document outlines the security audit vectors for Phase 7 prior to Mainnet launch.

## 1. JWT Implementation Audit
- **Algorithm Verification**: Ensure only `RS256` is accepted in `auth-service`.
- **Token Expiry**: Verify tokens expire in a reasonable timeframe (e.g., 15 minutes).
- **Signing Secrets**: Ensure the private key used to sign JWTs is strictly accessed from Vault and never logged.

## 2. Vault Configuration
- **Access Policies**: Ensure `ml-service` cannot access Bitcoin private keys meant for `crypto-service`.
- **Transit Secrets Engine**: Use Vault's transit engine for encrypting PII if applicable.

## 3. RLS (Row-Level Security) Policies in PostgreSQL
- **Tenant Isolation**: Ensure users from Org A cannot read shipments of Org B.
- **Audit Logging**: Confirm `audit_reporting_service` logs have append-only privileges and IMMUTABLE constraints where possible.
