# Phase 7: Mainnet Cutover & Go-Live Checklist

## Overview
This document outlines the final steps required to move the Origin platform from the Staging/Testnet environment to full Production Mainnet.

## Pre-Flight Checklist
- [ ] **Load Testing:** Passed (Simulated 10k devices via Locust without breaching latency SLAs).
- [ ] **Failover Testing:** Passed (RDS Multi-AZ, Redis, and Kafka cluster disruptions recovered automatically).
- [ ] **Security Audit:** Passed (JWT signatures, Vault configuration, PostgreSQL RLS, and WAF rules verified).
- [ ] **Data Wiping:** Staging data, dummy `shipments`, and dummy `users` cleared from the production database (`origin_db`).

## 1. Network & Infrastructure
- [ ] Ensure Production AWS EKS node pools are scaled to handle expected launch traffic.
- [ ] Verify SSL/TLS certificates on the API Gateway ingress are valid and attached to `api.origin.app`.
- [ ] Confirm AWS WAF rules are enabled to prevent DDoS and rate-limiting abuse.

## 2. Mainnet Bitcoin Cutover (Crypto Service)
- [ ] Deploy the Production Bitcoin Core Node synced to Mainnet (not Testnet/Regtest).
- [ ] Update `crypto-service` environment variables:
  - `BTC_NETWORK=mainnet`
  - `BTC_RPC_URL=http://<production-node>:8332`
- [ ] Generate new Production Multisig Keys via Hardware Security Modules (HSMs) or secure cold storage.
- [ ] Update HashiCorp Vault with the new production private keys for the Merkle tree anchoring and Escrow signatures.
- [ ] Fund the `crypto-service` anchoring wallet with real BTC to pay for `OP_RETURN` transaction fees.

## 3. Operations & Observability
- [ ] Configure PagerDuty/OpsGenie endpoints in Alertmanager (Grafana/Prometheus).
- [ ] Establish initial threshold rules for Alerting (e.g., ML Anomaly Spikes, Kafka Consumer Lag > 5000 messages, Node CPU > 80%).
- [ ] Ensure Daily Automated Backups are running for PostgreSQL and TimescaleDB.

## 4. Final Go-Live
- [ ] Update DNS `A/CNAME` records for `app.origin.app` to point to the production API Gateway/Ingress Controller.
- [ ] Monitor the ELK/FluentBit logs closely for the first 24 hours to catch edge-case exceptions.
- [ ] Execute a real, production test `Shipment` from a trusted device to verify end-to-end data flow (Postgres -> Kafka -> ML -> Bitcoin anchoring).
