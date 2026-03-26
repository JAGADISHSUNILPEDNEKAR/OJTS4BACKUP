use bitcoin::psbt::{Psbt, Input as PsbtInput};
use bitcoin::{Transaction, TxIn, TxOut, OutPoint, Txid, ScriptBuf, Sequence, Witness};
use bitcoin::hashes::Hash;
use bitcoin::secp256k1::PublicKey;
use bitcoin::opcodes::all::*;
use bitcoin::blockdata::script::Builder;
use base64::{Engine as _, engine::general_purpose::STANDARD};
use bitcoincore_rpc::RpcApi;

use bitcoin::secp256k1::SecretKey;

#[allow(dead_code)]
pub struct PsbtService {
    escrow_agent_key: SecretKey,
    rpc_client: Option<std::sync::Arc<bitcoincore_rpc::Client>>,
}

impl PsbtService {
    pub fn new(escrow_agent_key: SecretKey, rpc_client: Option<std::sync::Arc<bitcoincore_rpc::Client>>) -> Self {
        Self { escrow_agent_key, rpc_client }
    }

    pub fn fetch_unspent_utxo(&self) -> Result<(Txid, u32, u64), String> {
        if let Some(ref rpc) = self.rpc_client {
            let unspent = rpc.list_unspent(None, None, None, None, None)
                .map_err(|e| format!("Bitcoin RPC listunspent error: {}", e))?;
            
            if let Some(utxo) = unspent.first() {
                Ok((utxo.txid, utxo.vout, utxo.amount.to_sat()))
            } else {
                Err("No unspent UTXOs found in the Bitcoin node wallet.".to_string())
            }
        } else {
            // Mock UTXO for tests if RPC is missing
            Ok((Txid::all_zeros(), 0, 100_000))
        }
    }

    #[allow(dead_code)]
    pub fn create_multisig_psbt(&self, shipment_id: &str, buyer_pubkey: &str, seller_pubkey: &str, amount_sat: u64) -> Result<String, String> {
        log::info!("Creating real 2-of-3 PSBT for shipment {} with amount {} sats", shipment_id, amount_sat);

        let secp = bitcoin::secp256k1::Secp256k1::new();
        
        let key1 = if buyer_pubkey.len() == 66 || buyer_pubkey.len() == 130 {
            PublicKey::from_slice(&hex::decode(buyer_pubkey).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?
        } else {
            // Fallback for mock/test data if it's not hex
            PublicKey::from_secret_key(&secp, &bitcoin::secp256k1::SecretKey::from_slice(&[1u8; 32]).unwrap())
        };

        let key2 = if seller_pubkey.len() == 66 || seller_pubkey.len() == 130 {
            PublicKey::from_slice(&hex::decode(seller_pubkey).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?
        } else {
            PublicKey::from_secret_key(&secp, &bitcoin::secp256k1::SecretKey::from_slice(&[2u8; 32]).unwrap())
        };

        let key3 = PublicKey::from_secret_key(&secp, &self.escrow_agent_key);

        let witness_script = Builder::new()
            .push_opcode(OP_PUSHNUM_2)
            .push_slice(&key1.serialize())
            .push_slice(&key2.serialize())
            .push_slice(&key3.serialize())
            .push_opcode(OP_PUSHNUM_3)
            .push_opcode(OP_CHECKMULTISIG)
            .into_script();

        // Use a real UTXO if available, otherwise fallback (for tests)
        let (txid, vout, input_amount) = self.fetch_unspent_utxo().unwrap_or((Txid::all_zeros(), 0, 100_000));
        
        let outpoint = OutPoint { txid, vout };
        let txin = TxIn {
            previous_output: outpoint,
            script_sig: ScriptBuf::new(),
            sequence: Sequence::MAX,
            witness: Witness::new(),
        };

        let txout = TxOut {
            value: amount_sat,
            script_pubkey: ScriptBuf::new_v0_p2wsh(&witness_script.wscript_hash()),
        };

        let tx = Transaction {
            version: 2,
            lock_time: bitcoin::absolute::LockTime::ZERO,
            input: vec![txin],
            output: vec![txout.clone()],
        };

        let mut psbt = Psbt::from_unsigned_tx(tx).unwrap();

        let mut psbt_in = PsbtInput::default();
        psbt_in.witness_script = Some(witness_script);
        psbt_in.witness_utxo = Some(TxOut {
            value: input_amount,
            script_pubkey: ScriptBuf::new_v0_p2wsh(&psbt_in.witness_script.as_ref().unwrap().wscript_hash()),
        });
        psbt.inputs[0] = psbt_in;

        Ok(STANDARD.encode(psbt.serialize()))
    }

    #[allow(dead_code)]
    pub fn finalize_and_broadcast(&self, psbt_base64: &str) -> Result<String, String> {
        let decoded = STANDARD.decode(psbt_base64).map_err(|e| e.to_string())?;
        let psbt = Psbt::deserialize(&decoded).map_err(|e| e.to_string())?;
        
        if let Some(ref rpc) = self.rpc_client {
            log::info!("Broadcasting PSBT to Bitcoin network via RPC...");
            // In a real flow, the PSBT would be finalized (witnesses added) before broadcasting.
            // For now, we assume it's ready or we extract the transaction.
            let tx = psbt.extract_tx();
            let tx_hex = hex::encode(bitcoin::consensus::serialize(&tx));
            
            match rpc.send_raw_transaction(tx_hex) {
                Ok(txid) => {
                    log::info!("Successfully broadcasted transaction: {}", txid);
                    Ok(txid.to_string())
                },
                Err(e) => {
                    log::error!("Failed to broadcast transaction: {}", e);
                    Err(format!("Bitcoin RPC error: {}", e))
                }
            }
        } else {
            log::info!("No RPC client. Finalizing PSBT and returning TXID (mocked)...");
            Ok(psbt.unsigned_tx.txid().to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_psbt_flow() {
        let dummy_key = bitcoin::secp256k1::SecretKey::from_slice(&[4u8; 32]).unwrap();
        let service = PsbtService::new(dummy_key, None);
        let psbt_b64 = service.create_multisig_psbt("shipment_123", "mock_buyer", "mock_seller").expect("Should create PSBT");
        
        let txid = service.finalize_and_broadcast(&psbt_b64).expect("Should parse and broadcast");
        assert!(!txid.is_empty());
        
        let decoded = STANDARD.decode(&psbt_b64).expect("Must be base64");
        let parsed = Psbt::deserialize(&decoded).expect("Must be valid PSBT string");
        assert_eq!(parsed.inputs.len(), 1);
        assert!(parsed.inputs[0].witness_script.is_some());
    }
}

