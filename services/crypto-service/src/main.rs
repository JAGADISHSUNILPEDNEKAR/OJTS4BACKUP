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

use vault::VaultClient;
use bitcoin::secp256k1::SecretKey;

#[tokio::main]
async fn main() {
    env_logger::init();
    println!("Origin Crypto Service Starting...");
    println!("Initializing Vault, Merkle Builder and Bitcoin Anchoring worker...");

    let mut escrow_agent_key = SecretKey::from_slice(&[3u8; 32]).unwrap();
    if let Some(vault_client) = VaultClient::new() {
        match vault_client.get_system_keys().await {
            Ok(hex_key) => {
                if let Ok(bytes) = hex::decode(&hex_key) {
                    if let Ok(sk) = SecretKey::from_slice(&bytes) {
                        log::info!("Successfully loaded Escrow Agent key from Vault");
                        escrow_agent_key = sk;
                    } else {
                        log::error!("Vault key is invalid secp256k1 scalar");
                    }
                } else {
                    log::error!("Vault key is not valid hex");
                }
            },
            Err(e) => log::error!("Failed to fetch key from Vault: {}", e),
        }
    } else {
        log::warn!("Proceeding with mock Escrow Agent key.");
    }

    let rpc_url = env::var("BITCOIN_RPC_URL").unwrap_or_else(|_| "http://localhost:18332".to_string());
    let rpc_user = env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "admin".to_string());
    let rpc_pass = env::var("BITCOIN_RPC_PASS").unwrap_or_else(|_| "admin".to_string());

    let mut rpc_client_for_psbt = None;
    let anchoring_service: Arc<dyn AnchoringService + Send + Sync> = if let Ok(rpc) = Client::new(&rpc_url, Auth::UserPass(rpc_user, rpc_pass)) {
        if let Ok(info) = rpc.get_blockchain_info() {
            println!("Connected to Bitcoin testnet node: {}", info.chain);
            let rpc_arc = Arc::new(rpc);
            rpc_client_for_psbt = Some(rpc_arc.clone());
            Arc::new(anchoring::BitcoinClienWrapper::new(rpc_arc))
        } else {
            println!("Failed to connect to Bitcoin RPC. Using mock service.");
            Arc::new(MockAnchoringService)
        }
    } else {
        println!("Bitcoin RPC client error. Using mock service.");
        Arc::new(MockAnchoringService)
    };

    let kafka_brokers = env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".to_string());
    let kafka_publisher = Arc::new(kafka::KafkaPublisher::new(&kafka_brokers));

    let db_url = env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/origin".to_string());
    let anchoring_service_clone = anchoring_service.clone();
    let kafka_publisher_clone = kafka_publisher.clone();
    
    tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_secs(600));
        loop {
            interval.tick().await;
            log::info!("Running scheduled Merkle tree builder and anchoring job...");
            
            let (client, connection) = match tokio_postgres::connect(&db_url, tokio_postgres::NoTls).await {
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
                if let Err(e) = client.execute(insert_tree, &[&new_tree_id, &root_hex, &(leaves.len() as i32)]).await {
                    log::error!("Failed to insert merkle_tree record: {}", e);
                    continue;
                }
                
                // Update merkle_leaves
                // We're iterating one by one for simplicity in this job, ideally use bulk update or ANY
                for id in leaf_ids {
                    let update_leaf = "UPDATE merkle_leaves SET tree_id = $1, committed = true WHERE id = $2";
                    if let Err(e) = client.execute(update_leaf, &[&new_tree_id, &id]).await {
                        log::error!("Failed to update merkle_leaf {}: {}", id, e);
                    }
                }
                
                log::info!("Built and saved Merkle Tree {} with {} leaves", root_hex, leaves.len());

                match anchoring_service_clone.anchor_root(&root_bytes) {
                    Ok(txid) => {
                        log::info!("Anchored Merkle root {} with txid {}", root_hex, txid);
                        
                        let event = serde_json::json!({
                            "root": root_hex,
                            "txid": txid,
                            "timestamp": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()
                        });
                        
                        kafka_publisher_clone.publish("merkle.committed", &root_hex, &event).await;
                        kafka_publisher_clone.publish("bitcoin.anchored", &txid, &event).await;
                    },
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
                
                let psbt_service = psbt::PsbtService::new(escrow_agent_key, rpc_client_for_psbt);

                loop {
                    match c.recv().await {
                        Err(e) => log::warn!("Kafka error: {}", e),
                        Ok(m) => {
                            if let Some(payload) = m.payload() {
                                if let Ok(json_str) = std::str::from_utf8(payload) {
                                    if let Ok(req) = serde_json::from_str::<Value>(json_str) {
                                        if let Some(shipment_id) = req["shipment_id"].as_str() {
                                            log::info!("Received PSBT request for shipment: {}", shipment_id);
                                            
                                            let mut buyer_key = "";
                                            let mut seller_key = "";
                                            
                                            if let Some(participants) = req["participants"].as_array() {
                                                for p in participants {
                                                    if p["role"] == "buyer" {
                                                        buyer_key = p["public_key"].as_str().unwrap_or("");
                                                    } else if p["role"] == "seller" {
                                                        seller_key = p["public_key"].as_str().unwrap_or("");
                                                    }
                                                }
                                            }

                                            match psbt_service.create_multisig_psbt(shipment_id, buyer_key, seller_key) {
                                                Ok(generated_psbt) => {
                                                    let response = serde_json::json!({
                                                        "status": "PSBT_GENERATED",
                                                        "shipment_id": shipment_id,
                                                        "escrow_id": format!("ESC-{}", shipment_id),
                                                        "psbt": generated_psbt
                                                    });
                                                    
                                                    kafka_publisher_for_psbt.publish("escrow.psbt.response", shipment_id, &response).await;
                                                },
                                                Err(e) => log::error!("Failed to create PSBT: {}", e),
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            Err(e) => log::error!("Could not create Kafka consumer: {}", e),
        }
    });

    println!("Crypto service is running...");
    // Keep main thread alive
    tokio::signal::ctrl_c().await.unwrap();
    println!("Shutting down...");
}
