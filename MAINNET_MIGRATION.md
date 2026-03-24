# Mainnet Migration Runbook

This runbook outlines the steps to perform the final cutover for the Origin Platform to the Bitcoin Mainnet. **Please execute this with extreme caution and follow the HSM MultiSig processes carefully.**

## Prerequisites
1. Ensure all services are running and healthy on the `staging` network (simulating testnet).
2. Gather the 3 MultiSig key holders with their Hardware Security Modules (HSMs).
3. Ensure the production PostgreSQL database is fully migrated.

## Step 1: Crypto Service Configuration
1. Stop the `crypto-service` container in production.
   ```bash
   docker stop origin-crypto-service
   ```
2. Replace the environment variables using the `env.mainnet.example` config. Update `BITCOIN_RPC_URL` to point to the secure Mainnet Core node.
3. Validate connection to the Mainnet node.

## Step 2: Key Generation and Multisig Setup
1. Use `bitcoin-cli` or the native platform tools to generate new P2TR (Taproot) addresses for the mainnet escrow contracts.
2. Have all 3 keyholders sign a test transaction bridging a dust amount (e.g. 546 sats) to verify signature aggregation works out of the box.
3. Once the transaction verifies on-chain, update the internal `escrow-service` signing configuration with the new public keys.

## Step 3: Deployment
1. Restart the `crypto-service` with the production config.
   ```bash
   docker start origin-crypto-service
   ```
2. Monitor the `bitcoin.anchored` Kafka topic to ensure mainnet Merkle roots are successfully landing in the blockchain.
3. Observe the `api-gateway` and ensure telemetry traffic hits the platform successfully from active tracking devices.

## Step 4: Final Validation
1. Verify Escrow holds map accurately to real USD/BTC FX rates (as read from Mainnet Oracles).
2. Conduct a real end-to-end shipment audit holding $1.00 USD equivalent in BTC to confirm end-to-end execution.
