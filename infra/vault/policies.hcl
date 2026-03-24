# Origin Platform: HashiCorp Vault Policies (Production)

# 1. Crypto Service Policy
# crypto-service should only access its own secrets (like Bitcoin Mainnet keys and RPC)
path "secret/data/origin/crypto-service/*" {
  capabilities = ["read", "list"]
}

# 2. Auth Service Policy
# auth-service needs access to secrets like JWT Private Keys and DB credentials
path "secret/data/origin/auth-service/*" {
  capabilities = ["read", "list"]
}

# 3. ML Service Policy
# Penetration Testing Hardening: ml-service is explicitly denied access to crypto keys
path "secret/data/origin/crypto-service/*" {
  capabilities = ["deny"]
}

# ml-service accesses its own API keys (e.g. Pinecone/OpenAI)
path "secret/data/origin/ml-service/*" {
  capabilities = ["read", "list"]
}

# 4. Escrow Service Policy
# Needs access to signing public keys or HSM references 
path "secret/data/origin/escrow-service/*" {
  capabilities = ["read", "list"]
}

# 5. Global Transit Encryption (PII Encryption Engine via Vault)
# Penetration test hardening item: Services like Audit Reporting encrypt/decrypt logs PII
path "transit/encrypt/origin-pii" {
  capabilities = ["update"]
}

path "transit/decrypt/origin-pii" {
  capabilities = ["update"]
}
