#!/bin/bash

# Origin Platform - Production Vault Seeding Script
# This script initializes the production Vault with the necessary secrets for all hardened services.

export VAULT_ADDR=${VAULT_ADDR:-"http://localhost:8200"}
export VAULT_TOKEN=${VAULT_TOKEN:-"root"}

echo "Initializing Production Vault at $VAULT_ADDR..."

# 1. Enable Key-Value Secret Engine if not already enabled
vault secrets enable -path=secret kv-v2 || true

# 2. Auth Service - RS256 JWT Keys
echo "Seeding Auth Service RSA Keys..."
# REPLACE THESE WITH SECURE PRODUCTION KEYS
vault kv put secret/auth \
  private_key="-----BEGIN RSA PRIVATE KEY-----..." \
  public_key="-----BEGIN PUBLIC KEY-----..."

# 3. Database Credentials
echo "Seeding Database Credentials..."
vault kv put secret/db/origin \
  username="origin_admin" \
  password="SECURE_DB_PASSWORD"

vault kv put secret/db/timescaledb \
  username="tsdb_admin" \
  password="SECURE_TSDB_PASSWORD"

# 4. Crypto Service - Escrow Agent Key
echo "Seeding Crypto Service Escrow Agent Key..."
# Hex-encoded secp256k1 private key
vault kv put secret/crypto \
  escrow_agent_key="0101010101010101010101010101010101010101010101010101010101010101"

# 5. External API Keys
echo "Seeding External API Keys..."
vault kv put secret/external/sendgrid \
  api_key="SG.PRODUCTION_KEY"

echo "Vault seeding complete. Please ensure Kubernetes Pods have appropriate vault-k8s policies."
