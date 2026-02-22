#[allow(dead_code)]
pub struct PsbtService;

impl PsbtService {
    #[allow(dead_code)]
    pub fn create_multisig_psbt(&self, shipment_id: &str) -> String {
        log::info!("Creating dummy 2-of-3 PSBT for shipment {}", shipment_id);
        "base64_psbt_stub".to_string()
    }

    #[allow(dead_code)]
    pub fn finalize_and_broadcast(&self, _psbt_base64: &str) -> Result<String, String> {
        log::info!("Finalizing PSBT and broadcasting...");
        Ok("broadcast_txid".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_psbt_flow() {
        let service = PsbtService;
        let psbt = service.create_multisig_psbt("shipment_123");
        assert_eq!(psbt, "base64_psbt_stub");
        let txid = service.finalize_and_broadcast(&psbt).unwrap();
        assert_eq!(txid, "broadcast_txid");
    }
}
