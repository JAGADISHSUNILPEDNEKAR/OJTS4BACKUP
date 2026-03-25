import os
import httpx
import logging

logger = logging.getLogger(__name__)

class VaultClient:
    def __init__(self):
        self.vault_addr = os.getenv("VAULT_ADDR", "")
        self.vault_token = os.getenv("VAULT_TOKEN", "")
        self.enabled = bool(self.vault_addr and self.vault_token)
        
        if not self.enabled:
            logger.warning("VAULT_ADDR or VAULT_TOKEN not set, Vault integration is disabled.")

    async def get_jwt_keys(self):
        """Fetch RSA keys for JWT signing from Vault."""
        if not self.enabled:
            return None, None
            
        url = f"{self.vault_addr}/v1/secret/data/origin/auth-service/jwt_keys"
        headers = {"X-Vault-Token": self.vault_token}
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers)
                resp.raise_for_status()
                data = resp.json()["data"]["data"]
                return data.get("private_key"), data.get("public_key")
        except Exception as e:
            logger.error(f"Failed to fetch keys from Vault: {e}")
            return None, None
