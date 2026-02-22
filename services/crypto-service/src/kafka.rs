use serde::Serialize;
use std::time::Duration;
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::util::Timeout;

pub struct KafkaPublisher {
    producer: Option<FutureProducer>, // Use Option to allow mock
}

impl KafkaPublisher {
    pub fn new(brokers: &str) -> Self {
        let producer: Result<FutureProducer, _> = rdkafka::ClientConfig::new()
            .set("bootstrap.servers", brokers)
            .set("message.timeout.ms", "5000")
            .create();
            
        match producer {
            Ok(p) => Self { producer: Some(p) },
            Err(e) => {
                log::warn!("Could not create real Kafka producer: {}. Mocking publisher.", e);
                Self { producer: None }
            }
        }
    }

    pub async fn publish<T: Serialize>(&self, topic: &str, key: &str, payload: &T) {
        let json_payload = serde_json::to_string(payload).unwrap();
        log::info!("Publishing to {} [key: {}]: {}", topic, key, json_payload);

        if let Some(producer) = &self.producer {
            let record = FutureRecord::to(topic)
                .payload(&json_payload)
                .key(key);
                
            let _ = producer.send(record, Timeout::After(Duration::from_secs(2))).await;
        }
    }
}
