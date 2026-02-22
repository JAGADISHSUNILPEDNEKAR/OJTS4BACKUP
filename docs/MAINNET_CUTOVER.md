# Mainnet Cutover Procedure

This document outlines the final steps (Phase 7.4) required to migrate the Origin platform from Testnet/Staging to Production Mainnet.

## 1. Crypto Service Reconfiguration
The `crypto-service` currently anchors Merkle roots to the Bitcoin Testnet.

**Steps to Cutover:**
1. Provision a full Bitcoin Core node synced to Mainnet (or use a service like Blockdaemon/QuickNode for Mainnet RPC).
2. Update the environment variables in the production namespace for `crypto-service`:
   ```bash
   BITCOIN_NETWORK=mainnet
   BITCOIN_RPC_URL=http://<mainnet-node>:8332
   BITCOIN_RPC_USER=<secure-user>
   BITCOIN_RPC_PASS=<secure-pass>
   ```
3. **Key Rotation**: Rotate the multisig keys used for PSBT escrow. Generate new cold storage keys using HSMs (Hardware Security Modules) for the 2-of-3 multisig setups. Store the public keys in the `escrow-service` database.

## 2. Secrets Management
1. Move all production secrets (JWT private keys, DB passwords, API keys for SendGrid) into the production Vault instance.
2. Ensure Kubernetes Pods are configured to retrieve secrets via Vault Agent Injector and NOT from ConfigMaps.

## 3. DNS and Traffic Cutover
1. Point `app.origin.app` to the Production API Gateway/Ingress Controller.
2. Enable DDoS protection (e.g., AWS Shield or Cloudflare).
3. Open the traffic gates!
