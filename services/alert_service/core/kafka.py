import json
import logging
import uuid
from datetime import datetime, timezone
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from core.config import settings
from evaluator.threshold import evaluate
from notifications.dispatcher import dispatch_alert

CONSUMER_GROUP = "alert-service-group"
logger = logging.getLogger(__name__)

producer: AIOKafkaProducer = None
recent_alerts = []


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

def get_recent_alerts():
    return recent_alerts

async def consume_ml_results():
    import datetime
    consumer = AIOKafkaConsumer(
        'ml.events',
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id="alert-service-group",
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )
    await consumer.start()
    logger.info("Kafka Consumer listening on ml.events")
    try:
        async for msg in consumer:
            event = msg.value
            try:
                if event.get('event') == 'ml.inference.completed':
                    score = event.get('score', 0.0)
                    shipment_id = event.get('shipment_id')

                    if not shipment_id:
                        await _publish_to_dlq(msg.topic, event, ValueError("missing shipment_id"))
                        continue

                    is_alert = await evaluate(score)
                    if is_alert:
                        severity = "CRITICAL" if score > 0.9 else "WARNING"
                        await dispatch_alert(shipment_id, score, severity)

                        alert_event = {
                            "event_id": str(uuid.uuid4()),
                            "event": "alert.created",
                            "shipment_id": shipment_id,
                            "severity": severity,
                            "score": score,
                            "timestamp": datetime.datetime.now().isoformat()
                        }

                        recent_alerts.insert(0, alert_event)
                        if len(recent_alerts) > 50:
                            recent_alerts.pop()

                        if producer:
                            await producer.send_and_wait('alert.events', alert_event)
                            logger.info(f"Published alert.created for shipment {shipment_id}")
            except Exception as e:
                logger.exception(f"Processing failed for {msg.topic}: {e}")
                await _publish_to_dlq(msg.topic, event, e)
    finally:
        await consumer.stop()
