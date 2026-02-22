use bitcoincore_rpc::Client;

pub trait AnchoringService {
    fn anchor_root(&self, root: &[u8]) -> Result<String, String>;
}

pub struct BitcoinClienWrapper {
    client: Client,
}

impl BitcoinClienWrapper {
    pub fn new(client: Client) -> Self {
        Self { client }
    }
}

impl AnchoringService for BitcoinClienWrapper {
    fn anchor_root(&self, _root: &[u8]) -> Result<String, String> {
        // Real implementation would build a transaction with OP_RETURN
        // and broadcast it via self.client
        Ok("real_txid_stub".to_string())
    }
}

pub struct MockAnchoringService;

impl AnchoringService for MockAnchoringService {
    fn anchor_root(&self, root: &[u8]) -> Result<String, String> {
        log::info!("[Mock] Anchoring Merkle root: {:?}", root);
        Ok(format!("mock_txid"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_anchoring() {
        let service = MockAnchoringService;
        let result = service.anchor_root(b"dummy_root").unwrap();
        assert_eq!(result, "mock_txid");
    }
}
