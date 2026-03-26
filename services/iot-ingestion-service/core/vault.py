import os
import httpx
import logging

logger = logging.getLogger(__name__)

class VaultClient:
    def __init__(self):
        self.vault_addr = os.getenv("VAULT_ADDR", "http://vault:8200")
        self.vault_token = os.getenv("VAULT_TOKEN", "")
        self.enabled = bool(self.vault_addr and self.vault_token)
        
        if not self.enabled:
            logger.warning("VAULT_ADDR or VAULT_TOKEN not set, Vault integration is disabled.")

    async def get_device_secret(self, device_id: str):
        """Fetch HMAC secret for a specific device from Vault."""
        if not self.enabled:
            return None
            
        # Path: secret/data/origin/iot-service/devices/{device_id}
        url = f"{self.vault_addr}/v1/secret/data/origin/iot-service/devices/{device_id}"
        headers = {"X-Vault-Token": self.vault_token}
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers)
                resp.raise_for_status()
                data = resp.json()["data"]["data"]
                return data.get("hmac_secret")
        except Exception as e:
            logger.error(f"Failed to fetch secret for device {device_id} from Vault: {e}")
            return None
