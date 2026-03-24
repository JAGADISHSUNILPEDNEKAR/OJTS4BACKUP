use reqwest::Client;
use serde_json::Value;
use std::env;

#[derive(Clone)]
pub struct VaultClient {
    client: Client,
    vault_addr: String,
    vault_token: String,
}

impl VaultClient {
    pub fn new() -> Option<Self> {
        let vault_addr = env::var("VAULT_ADDR").unwrap_or_else(|_| "".to_string());
        let vault_token = env::var("VAULT_TOKEN").unwrap_or_else(|_| "".to_string());

        if vault_addr.is_empty() {
            log::warn!("VAULT_ADDR is not set, Vault integration is disabled.");
            return None;
        }

        Some(Self {
            client: Client::new(),
            vault_addr,
            vault_token,
        })
    }

    pub async fn get_system_keys(&self) -> Result<String, String> {
        let url = format!("{}/v1/secret/data/origin/crypto-service/system_keys", self.vault_addr);
        
        let response = self.client.get(&url)
            .header("X-Vault-Token", &self.vault_token)
            .send()
            .await
            .map_err(|e| format!("Network request to vault failed: {}", e))?;
            
        if !response.status().is_success() {
            return Err(format!("Vault returned error status: {}", response.status()));
        }
        
        let json: Value = response.json().await
            .map_err(|e| format!("Failed to parse vault response: {}", e))?;
            
        let key = json["data"]["data"]["escrow_agent_key"]
            .as_str()
            .ok_or_else(|| "Missing escrow_agent_key in Vault response".to_string())?;
            
        Ok(key.to_string())
    }
}
