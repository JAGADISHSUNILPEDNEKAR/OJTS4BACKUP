import json
import logging
from datetime import datetime, timezone
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from core.config import settings
from features.extractor import extract_features
from models.inference import inference_engine

CONSUMER_GROUP = "ml-service-group"
logger = logging.getLogger(__name__)

producer: AIOKafkaProducer = None


async def _publish_to_dlq(original_topic: str, value, error: Exception):
    """Best-effort route to <original_topic>.dlq using the shared producer."""
    if producer is None:
        logger.error(f"DLQ for {original_topic} not routed (producer not started): {error}")
        return
    dlq_topic = f"{original_topic}.dlq"
    payload = {
        "original_topic": original_topic,
        "value": value,
        "error": str(error),
        "error_type": type(error).__name__,
        "consumer_group": CONSUMER_GROUP,
        "failed_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await producer.send_and_wait(dlq_topic, payload)
        logger.warning(f"Routed poison message to {dlq_topic}: {error}")
    except Exception as e:
        logger.error(f"Failed to publish to DLQ {dlq_topic}: {e}")

async def start_kafka_producer():
    global producer
    producer = AIOKafkaProducer(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    await producer.start()
    logger.info("Kafka Producer started")

async def stop_kafka_producer():
    global producer
    if producer:
        await producer.stop()
        logger.info("Kafka Producer stopped")

async def consume_events():
    consumer = AIOKafkaConsumer(
        'shipment.created', 'sensor.ingested', 'custody.handoff',
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id="ml-service-group",
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset='earliest'
    )
    await consumer.start()
    logger.info("Kafka Consumer started listening to events")
    try:
        async for msg in consumer:
            event = msg.value
            logger.info(f"Consumed event from {msg.topic}: {event}")
            shipment_id = event.get('shipment_id') or event.get('id')
            if not shipment_id:
                logger.warning("Event missing shipment_id or id — routing to DLQ")
                await _publish_to_dlq(msg.topic, event, ValueError("missing shipment_id"))
                continue

            try:
                if msg.topic == 'sensor.ingested':
                    features = await extract_features(shipment_id)
                    score = inference_engine.predict(features)

                    result_event = {
                        "event": "ml.inference.completed",
                        "shipment_id": shipment_id,
                        "score": score,
                        "model_version": "v1.0"
                    }
                    logger.info(f"Publishing ml.inference.completed for shipment {shipment_id} with score {score}")
                    if producer:
                        await producer.send_and_wait('ml.events', result_event)
                elif msg.topic in ['shipment.created', 'custody.handoff']:
                    logger.info(f"Received {msg.topic} for shipment {shipment_id}, internal routing graph updated.")
            except Exception as e:
                logger.exception(f"Processing failed for {msg.topic}: {e}")
                await _publish_to_dlq(msg.topic, event, e)
    finally:
        await consumer.stop()
