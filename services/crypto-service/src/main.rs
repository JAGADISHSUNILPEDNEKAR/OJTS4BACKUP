// use bitcoincore_rpc::{Auth, Client, RpcApi};
// use std::env;

#[tokio::main]
async fn main() {
    env_logger::init();
    println!("Origin Crypto Service Starting...");
    println!("Initializing Merkle Builder and Bitcoin Anchoring worker...");

    // let rpc_url = env::var("BITCOIN_RPC_URL").unwrap_or_else(|_| "http://localhost:18332".to_string());
    // let rpc_user = env::var("BITCOIN_RPC_USER").unwrap_or_else(|_| "admin".to_string());
    // let rpc_pass = env::var("BITCOIN_RPC_PASS").unwrap_or_else(|_| "admin".to_string());
    // let rpc = Client::new(&rpc_url, Auth::UserPass(rpc_user, rpc_pass)).unwrap();
    // 
    // println!("Connected to Bitcoin testnet node: {}", rpc.get_blockchain_info().unwrap().chain);

    // TODO: Implement Merkle Tree Builder, OP_RETURN broadcasts, and PSBT flows.
    // TODO: Connect to Kafka to publish merkle.committed and bitcoin.anchored.
}
