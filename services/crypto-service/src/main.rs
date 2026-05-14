mod anchoring;
mod kafka;
mod merkle;
mod psbt;
mod vault;

use anchoring::{AnchoringService, MockAnchoringService};
use bitcoin::hashes::Hash;
use bitcoincore_rpc::{Auth, Client, RpcApi};
use std::env;
use std::sync::Arc;
use std::time::Duration;
use tokio::time;

use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::ClientConfig;
use rdkafka::Message;
use serde_json::Value;

use bitcoin::secp256k1::SecretKey;
use vault::VaultClient;

/// Fail-closed knob, mirroring the Python services' REQUIRE_VAULT_KEYS /
/// REQUIRE_INTERNAL_API_KEY pattern. Defaults to true in production so the
/// service refuses to start with a mock Bitcoin RPC client or mock escrow
/// key. Set to "false" locally (docker-compose) where a real Vault and
/// bitcoind aren't available.
fn env_bool(name: &str, default: bool) -> bool {
    match env::var(name) {
        Ok(v) => matches!(v.as_str(), "true" | "1" | "TRUE" | "True"),
        Err(_) => default,
    }
}

#[tokio::main]
async fn main() {
    env_logger::init();
    log::info!("Origin Crypto Service Starting...");
    log::info!("Initializing Vault, Merkle Builder and Bitcoin Anchoring worker...");

    let require_vault_keys = env_bool("REQUIRE_VAULT_SYSTEM_KEYS", true);
    let require_bitcoin_rpc = env_bool("REQUIRE_BITCOIN_RPC", true);

    // Vault-backed Escrow Agent key — fail-closed when REQUIRE_VAULT_SYSTEM_KEYS
    // is true and we can't load a real key. Signing 2-of-3 multisig PSBTs with
    // a deterministic [3u8; 32] is equivalent to publishing one of the three
    // escrow signing keys in the repo.
    let escrow_agent_key = load_escrow_agent_key(require_vault_keys).await;

    let rpc_url =
        env::var("BITCOIN_RPC_URL").unwrap_or_else(|_| "http://localhost:18332".to_string());
    let rpc_user = env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "admin".to_string());
    let rpc_pass = env::var("BITCOIN_RPC_PASS").unwrap_or_else(|_| "admin".to_string());

    let (anchoring_service, rpc_client_for_psbt) =
        build_anchoring(&rpc_url, rpc_user, rpc_pass, require_bitcoin_rpc);

    let kafka_brokers = env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".to_string());
    let kafka_publisher = Arc::new(kafka::KafkaPublisher::new(&kafka_brokers));

    let db_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/origin".to_string());
    let anchoring_service_clone = anchoring_service.clone();
    let kafka_publisher_clone = kafka_publisher.clone();

    // Shared state for "wiring" between anchoring and PSBT discovery
    let last_anchor_txid = Arc::new(std::sync::RwLock::new(None));
    let last_anchor_txid_for_job = last_anchor_txid.clone();
    let last_anchor_txid_for_psbt = last_anchor_txid.clone();

    tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_secs(600));
        loop {
            interval.tick().await;
            log::info!("Running scheduled Merkle tree builder and anchoring job...");

            let (client, connection) =
                match tokio_postgres::connect(&db_url, tokio_postgres::NoTls).await {
                    Ok(conn) => conn,
                    Err(e) => {
                        log::error!("Failed to connect to Postgres: {}", e);
                        continue;
                    }
                };

            tokio::spawn(async move {
                if let Err(e) = connection.await {
                    log::error!("Postgres connection error: {}", e);
                }
            });

            let query = "SELECT id, leaf_hash FROM merkle_leaves WHERE committed = false";
            let rows = match client.query(query, &[]).await {
                Ok(r) => r,
                Err(e) => {
                    log::error!("Failed to query merkle_leaves: {}", e);
                    continue;
                }
            };

            if rows.is_empty() {
                log::info!("No uncommitted leaves found. Skipping Merkle Tree build.");
                continue;
            }

            let mut leaves = Vec::new();
            let mut leaf_ids = Vec::new();

            for row in &rows {
                let id: uuid::Uuid = row.get(0);
                let leaf_hash: String = row.get(1);
                if let Ok(hash_bytes) = hex::decode(&leaf_hash) {
                    if let Ok(sha_hash) = bitcoin::hashes::sha256::Hash::from_slice(&hash_bytes) {
                        leaves.push(sha_hash);
                        leaf_ids.push(id);
                    }
                }
            }

            if leaves.is_empty() {
                log::warn!("Found rows but no valid Hashes could be parsed.");
                continue;
            }

            let tree = merkle::MerkleTree::from_hashes(leaves.clone());

            if let Some(root) = tree.root() {
                let root_bytes = root.to_byte_array();
                let root_hex = root.to_string();
                let new_tree_id = uuid::Uuid::new_v4();

                // Insert into merkle_trees
                let insert_tree = "INSERT INTO merkle_trees (id, root_hash, leaf_count, commitment_timestamp) VALUES ($1, $2, $3, NOW())";
                if let Err(e) = client
                    .execute(
                        insert_tree,
                        &[&new_tree_id, &root_hex, &(leaves.len() as i32)],
                    )
                    .await
                {
                    log::error!("Failed to insert merkle_tree record: {}", e);
                    continue;
                }

                // Update merkle_leaves
                // We're iterating one by one for simplicity in this job, ideally use bulk update or ANY
                for id in leaf_ids {
                    let update_leaf =
                        "UPDATE merkle_leaves SET tree_id = $1, committed = true WHERE id = $2";
                    if let Err(e) = client.execute(update_leaf, &[&new_tree_id, &id]).await {
                        log::error!("Failed to update merkle_leaf {}: {}", id, e);
                    }
                }

                log::info!(
                    "Built and saved Merkle Tree {} with {} leaves",
                    root_hex,
                    leaves.len()
                );

                match anchoring_service_clone.anchor_root(&root_bytes) {
                    Ok(txid) => {
                        log::info!("Anchored Merkle root {} with txid {}", root_hex, txid);

                        // Wire it: Update last_anchor_txid so PsbtService can prioritize it
                        if let Ok(parsed_txid) = txid.parse::<bitcoin::Txid>() {
                            let mut last = last_anchor_txid_for_job.write().unwrap();
                            *last = Some(parsed_txid);
                        }

                        let event = serde_json::json!({
                            "root": root_hex,
                            "txid": txid,
                            "timestamp": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()
                        });

                        kafka_publisher_clone
                            .publish("merkle.committed", &root_hex, &event)
                            .await;
                        kafka_publisher_clone
                            .publish("bitcoin.anchored", &txid, &event)
                            .await;
                    }
                    Err(e) => log::error!("Failed to anchor root: {}", e),
                }
            }
        }
    });

    let kafka_brokers_clone = kafka_brokers.clone();
    let kafka_publisher_for_psbt = kafka_publisher.clone();

    // PSBT Generation Kafka Consumer
    tokio::spawn(async move {
        let consumer: Result<StreamConsumer, _> = ClientConfig::new()
            .set("group.id", "crypto-service-group")
            .set("bootstrap.servers", &kafka_brokers_clone)
            .set("enable.partition.eof", "false")
            .set("session.timeout.ms", "6000")
            .set("enable.auto.commit", "true")
            .create();

        match consumer {
            Ok(c) => {
                if let Err(e) = c.subscribe(&["escrow.psbt.request"]) {
                    log::error!("Failed to subscribe to escrow.psbt.request: {}", e);
                    return;
                }
                log::info!("Listening for PSBT requests on escrow.psbt.request...");

                let psbt_service = psbt::PsbtService::new(
                    escrow_agent_key,
                    rpc_client_for_psbt,
                    last_anchor_txid_for_psbt,
                    require_bitcoin_rpc,
                );

                loop {
                    match c.recv().await {
                        Err(e) => log::warn!("Kafka error: {}", e),
                        Ok(m) => {
                            if let Some(payload) = m.payload() {
                                if let Ok(json_str) = std::str::from_utf8(payload) {
                                    if let Ok(req) = serde_json::from_str::<Value>(json_str) {
                                        if let Some(shipment_id) = req["shipment_id"].as_str() {
                                            log::info!(
                                                "Received PSBT request for shipment: {}",
                                                shipment_id
                                            );

                                            let mut buyer_key = "";
                                            let mut seller_key = "";

                                            if let Some(participants) =
                                                req["participants"].as_array()
                                            {
                                                for p in participants {
                                                    if p["role"] == "buyer" {
                                                        buyer_key =
                                                            p["public_key"].as_str().unwrap_or("");
                                                    } else if p["role"] == "seller" {
                                                        seller_key =
                                                            p["public_key"].as_str().unwrap_or("");
                                                    }
                                                }
                                            }

                                            let amount_btc =
                                                req["amount_btc"].as_f64().unwrap_or(0.001);
                                            let amount_sat = (amount_btc * 100_000_000.0) as u64;

                                            match psbt_service.create_multisig_psbt(
                                                shipment_id,
                                                buyer_key,
                                                seller_key,
                                                amount_sat,
                                            ) {
                                                Ok(generated_psbt) => {
                                                    let response = serde_json::json!({
                                                        "status": "PSBT_GENERATED",
                                                        "shipment_id": shipment_id,
                                                        "escrow_id": format!("ESC-{}", shipment_id),
                                                        "psbt": generated_psbt
                                                    });

                                                    kafka_publisher_for_psbt
                                                        .publish(
                                                            "escrow.psbt.response",
                                                            shipment_id,
                                                            &response,
                                                        )
                                                        .await;
                                                }
                                                Err(e) => {
                                                    log::error!("Failed to create PSBT: {}", e)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => log::error!("Could not create Kafka consumer: {}", e),
        }
    });

    log::info!("Crypto service is running...");
    // Keep main thread alive
    tokio::signal::ctrl_c().await.unwrap();
    log::info!("Shutting down...");
}

async fn load_escrow_agent_key(require_vault_keys: bool) -> SecretKey {
    let vault_client = match VaultClient::new() {
        Some(c) => c,
        None => {
            if require_vault_keys {
                panic!(
                    "REQUIRE_VAULT_SYSTEM_KEYS=true but Vault client could not be \
                     initialized (VAULT_ADDR / VAULT_TOKEN unset). Refusing to start \
                     with a hardcoded mock Escrow Agent key."
                );
            }
            log::warn!("Vault disabled — using hardcoded mock Escrow Agent key (DEV ONLY).");
            return SecretKey::from_slice(&[3u8; 32]).unwrap();
        }
    };

    match vault_client.get_system_keys().await {
        Ok(hex_key) => {
            let bytes = hex::decode(&hex_key)
                .unwrap_or_else(|e| panic!("Vault key is not valid hex: {}", e));
            SecretKey::from_slice(&bytes)
                .unwrap_or_else(|e| panic!("Vault key is invalid secp256k1 scalar: {}", e))
        }
        Err(e) => {
            if require_vault_keys {
                panic!(
                    "REQUIRE_VAULT_SYSTEM_KEYS=true and Vault returned an error: {}. \
                     Refusing to start with a hardcoded mock Escrow Agent key.",
                    e
                );
            }
            log::warn!("Failed to fetch key from Vault ({e}). Using hardcoded mock key.");
            SecretKey::from_slice(&[3u8; 32]).unwrap()
        }
    }
}

fn build_anchoring(
    rpc_url: &str,
    rpc_user: String,
    rpc_pass: String,
    require_bitcoin_rpc: bool,
) -> (
    Arc<dyn AnchoringService + Send + Sync>,
    Option<Arc<bitcoincore_rpc::Client>>,
) {
    match Client::new(rpc_url, Auth::UserPass(rpc_user, rpc_pass)) {
        Ok(rpc) => match rpc.get_blockchain_info() {
            Ok(info) => {
                log::info!("Connected to Bitcoin node: {}", info.chain);
                let rpc_arc = Arc::new(rpc);
                let svc: Arc<dyn AnchoringService + Send + Sync> =
                    Arc::new(anchoring::BitcoinClienWrapper::new(rpc_arc.clone()));
                (svc, Some(rpc_arc))
            }
            Err(e) => bail_or_mock(
                require_bitcoin_rpc,
                &format!("get_blockchain_info failed: {}", e),
            ),
        },
        Err(e) => bail_or_mock(
            require_bitcoin_rpc,
            &format!("Bitcoin RPC client init failed: {}", e),
        ),
    }
}

fn bail_or_mock(
    require_bitcoin_rpc: bool,
    reason: &str,
) -> (
    Arc<dyn AnchoringService + Send + Sync>,
    Option<Arc<bitcoincore_rpc::Client>>,
) {
    if require_bitcoin_rpc {
        panic!(
            "REQUIRE_BITCOIN_RPC=true but Bitcoin RPC is unreachable ({reason}). \
             Refusing to start with a mock anchoring service — it would broadcast \
             fake txids for every Merkle commitment."
        );
    }
    log::warn!("Bitcoin RPC unreachable ({reason}). Using MockAnchoringService (DEV ONLY).");
    (Arc::new(MockAnchoringService), None)
}
