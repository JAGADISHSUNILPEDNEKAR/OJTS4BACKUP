import logging
import json
import os
from datetime import datetime, timezone
from aiokafka import AIOKafkaProducer

logger = logging.getLogger("escrow-service.producer")

_producer = None

async def get_producer():
    global _producer
    if _producer is None:
        bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
        _producer = AIOKafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        await _producer.start()
    return _producer

async def publish_message(topic: str, key: str, value: dict):
    producer = await get_producer()
    logger.info(f"Publishing message to {topic} [key: {key}]")
    await producer.send_and_wait(topic, key=key.encode('utf-8') if key else None, value=value)


async def publish_to_dlq(original_topic: str, value, error: Exception, consumer_group: str):
    """Route a poison message to <original_topic>.dlq so the main consumer
    can advance past it instead of crashing or infinite-retrying.
    """
    dlq_topic = f"{original_topic}.dlq"
    payload = {
        "original_topic": original_topic,
        "value": value,
        "error": str(error),
        "error_type": type(error).__name__,
        "consumer_group": consumer_group,
        "failed_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        producer = await get_producer()
        await producer.send_and_wait(dlq_topic, value=payload)
        logger.warning(f"Routed poison message to {dlq_topic}: {error}")
    except Exception as e:
        # If even the DLQ send fails (broker down, etc.), log and continue —
        # never let DLQ failure crash the main consumer loop.
        logger.error(f"Failed to publish to DLQ {dlq_topic}: {e}")


async def close_producer():
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None
