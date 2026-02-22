mod anchoring;
mod kafka;
mod merkle;
mod psbt;

use anchoring::{AnchoringService, MockAnchoringService};
use bitcoin::hashes::Hash;
use bitcoincore_rpc::{Auth, Client, RpcApi};
use std::env;
use std::sync::Arc;
use std::time::Duration;
use tokio::time;

#[tokio::main]
async fn main() {
    env_logger::init();
    println!("Origin Crypto Service Starting...");
    println!("Initializing Merkle Builder and Bitcoin Anchoring worker...");

    let rpc_url = env::var("BITCOIN_RPC_URL").unwrap_or_else(|_| "http://localhost:18332".to_string());
    let rpc_user = env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "admin".to_string());
    let rpc_pass = env::var("BITCOIN_RPC_PASS").unwrap_or_else(|_| "admin".to_string());

    let anchoring_service: Arc<dyn AnchoringService + Send + Sync> = if let Ok(rpc) = Client::new(&rpc_url, Auth::UserPass(rpc_user, rpc_pass)) {
        if let Ok(info) = rpc.get_blockchain_info() {
            println!("Connected to Bitcoin testnet node: {}", info.chain);
            Arc::new(anchoring::BitcoinClienWrapper::new(rpc))
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

    // Schedule 10-minute job
    let anchoring_service_clone = anchoring_service.clone();
    let kafka_publisher_clone = kafka_publisher.clone();
    
    tokio::spawn(async move {
        // Run every 10 minutes (using 600 seconds)
        let mut interval = time::interval(Duration::from_secs(600));
        loop {
            interval.tick().await;
            log::info!("Running scheduled Merkle tree builder and anchoring job...");
            
            // In a real scenario, this would pull uncommitted leaves from a database.
            let dummy_data: Vec<&[u8]> = vec![b"sensor_reading_1", b"shipment_handoff_2"];
            let tree = merkle::MerkleTree::new(dummy_data);

            if let Some(root) = tree.root() {
                let root_bytes = root.to_byte_array();
                match anchoring_service_clone.anchor_root(&root_bytes) {
                    Ok(txid) => {
                        let root_hex = root.to_string();
                        log::info!("Anchored Merkle root {} with txid {}", root_hex, txid);
                        
                        // Publish merkle.committed and bitcoin.anchored
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

    println!("Crypto service is running...");
    // Keep main thread alive
    tokio::signal::ctrl_c().await.unwrap();
    println!("Shutting down...");
}
