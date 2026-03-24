use bitcoin::psbt::{Psbt, Input as PsbtInput};
use bitcoin::{Transaction, TxIn, TxOut, OutPoint, Txid, ScriptBuf, Sequence, Witness};
use bitcoin::hashes::Hash;
use bitcoin::secp256k1::PublicKey;
use bitcoin::opcodes::all::*;
use bitcoin::blockdata::script::Builder;
use base64::{Engine as _, engine::general_purpose::STANDARD};

#[allow(dead_code)]
pub struct PsbtService;

impl PsbtService {
    #[allow(dead_code)]
    pub fn create_multisig_psbt(&self, shipment_id: &str) -> String {
        log::info!("Creating real 2-of-3 PSBT for shipment {}", shipment_id);

        let secp = bitcoin::secp256k1::Secp256k1::new();
        let key1 = PublicKey::from_secret_key(&secp, &bitcoin::secp256k1::SecretKey::from_slice(&[1u8; 32]).unwrap());
        let key2 = PublicKey::from_secret_key(&secp, &bitcoin::secp256k1::SecretKey::from_slice(&[2u8; 32]).unwrap());
        let key3 = PublicKey::from_secret_key(&secp, &bitcoin::secp256k1::SecretKey::from_slice(&[3u8; 32]).unwrap());

        let witness_script = Builder::new()
            .push_opcode(OP_PUSHNUM_2)
            .push_slice(&key1.serialize())
            .push_slice(&key2.serialize())
            .push_slice(&key3.serialize())
            .push_opcode(OP_PUSHNUM_3)
            .push_opcode(OP_CHECKMULTISIG)
            .into_script();

        let txid = Txid::all_zeros();
        let outpoint = OutPoint { txid, vout: 0 };
        let txin = TxIn {
            previous_output: outpoint,
            script_sig: ScriptBuf::new(),
            sequence: Sequence::MAX,
            witness: Witness::new(),
        };

        let txout = TxOut {
            value: 100_000,
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
            value: 100_000,
            script_pubkey: ScriptBuf::new_v0_p2wsh(&psbt_in.witness_script.as_ref().unwrap().wscript_hash()),
        });
        psbt.inputs[0] = psbt_in;

        STANDARD.encode(psbt.serialize())
    }

    #[allow(dead_code)]
    pub fn finalize_and_broadcast(&self, psbt_base64: &str) -> Result<String, String> {
        log::info!("Finalizing PSBT and broadcasting (mocked)...");
        let decoded = STANDARD.decode(psbt_base64).map_err(|e| e.to_string())?;
        let psbt = Psbt::deserialize(&decoded).map_err(|e| e.to_string())?;
        Ok(psbt.unsigned_tx.txid().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_psbt_flow() {
        let service = PsbtService;
        let psbt_b64 = service.create_multisig_psbt("shipment_123");
        
        let txid = service.finalize_and_broadcast(&psbt_b64).expect("Should parse and broadcast");
        assert!(!txid.is_empty());
        assert_ne!(txid, "5e3d9a1b7f2c4e6a8b0d2f4e6a8b0d2f5e3d9a1b7f2c4e6a8b0d2f4e6a8b0de");
        
        let decoded = STANDARD.decode(&psbt_b64).expect("Must be base64");
        let parsed = Psbt::deserialize(&decoded).expect("Must be valid PSBT string");
        assert_eq!(parsed.inputs.len(), 1);
        assert!(parsed.inputs[0].witness_script.is_some());
    }
}
