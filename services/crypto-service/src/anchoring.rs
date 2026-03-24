use bitcoincore_rpc::{Client, RpcApi};
use bitcoin::{Transaction, TxOut};
use bitcoin::blockdata::script::Builder;
use bitcoin::opcodes::all::*;

pub trait AnchoringService {
    fn anchor_root(&self, root: &[u8]) -> Result<String, String>;
}

#[allow(dead_code)]
pub struct BitcoinClienWrapper {
    client: Client,
}

impl BitcoinClienWrapper {
    pub fn new(client: Client) -> Self {
        Self { client }
    }
}

impl AnchoringService for BitcoinClienWrapper {
    fn anchor_root(&self, root: &[u8]) -> Result<String, String> {
        if root.len() != 32 {
            return Err("Root must be 32 bytes".to_string());
        }
        let mut root_array = [0u8; 32];
        root_array.copy_from_slice(root);

        let script_pubkey = Builder::new()
            .push_opcode(OP_RETURN)
            .push_slice(&root_array)
            .into_script();

        let tx = Transaction {
            version: 2,
            lock_time: bitcoin::absolute::LockTime::ZERO,
            input: vec![],
            output: vec![TxOut {
                value: 0,
                script_pubkey,
            }],
        };

        // Fund the transaction (adds UTXOs and change output, calculates fee)
        let funded = self.client.fund_raw_transaction(&tx, None, Some(true))
            .map_err(|e| format!("fund_raw_transaction failed: {}", e))?;

        // Sign the inputs using the node's wallet
        let signed = self.client.sign_raw_transaction_with_wallet(&funded.hex, None, None)
            .map_err(|e| format!("sign_raw_transaction_with_wallet failed: {}", e))?;

        if !signed.complete {
            return Err("Failed to completely sign the transaction".to_string());
        }

        // Broadcast to network
        let broadcasted_txid = self.client.send_raw_transaction(&signed.hex)
            .map_err(|e| format!("send_raw_transaction failed: {}", e))?;

        Ok(broadcasted_txid.to_string())
    }
}

pub struct MockAnchoringService;

impl AnchoringService for MockAnchoringService {
    fn anchor_root(&self, root: &[u8]) -> Result<String, String> {
        log::info!("[Mock] Anchoring Merkle root: {:?}", root);
        Ok("5e3d9a1b7f2c4e6a8b0d2f4e6a8b0d2f5e3d9a1b7f2c4e6a8b0d2f4e6a8b0de".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_anchoring() {
        let service = MockAnchoringService;
        let result = service.anchor_root(b"dummy_root").unwrap();
        assert_eq!(result, "5e3d9a1b7f2c4e6a8b0d2f4e6a8b0d2f5e3d9a1b7f2c4e6a8b0d2f4e6a8b0de");
    }
}
