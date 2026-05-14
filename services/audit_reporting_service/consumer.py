import json
import logging
from datetime import datetime, timezone
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

from core.config import settings
from database import AsyncSessionLocal
from models import AuditLog

CONSUMER_GROUP = "audit-sink-group"
logger = logging.getLogger("audit-reporting.consumer")

_dlq_producer: AIOKafkaProducer = None


async def _publish_to_dlq(original_topic: str, value, error: Exception):
    """Route a poison message to <original_topic>.dlq. Lazy-inits a
    dedicated producer the first time it's called.
    """
    global _dlq_producer
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
        if _dlq_producer is None:
            _dlq_producer = AIOKafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
            )
            await _dlq_producer.start()
        await _dlq_producer.send_and_wait(dlq_topic, value=payload)
        logger.warning(f"Routed poison message to {dlq_topic}: {error}")
    except Exception as e:
        logger.error(f"Failed to publish to DLQ {dlq_topic}: {e}")

class SchemaValidator:
    def __init__(self):
        self.enabled = settings.SCHEMA_REGISTRY_URL is not None
        # Simple local schema map for the most critical topics
        self.schemas = {
            "shipment.created": ["shipment_id", "farmer_id"],
            "merkle.committed": ["root", "txid"],
            "bitcoin.anchored": ["txid"]
        }

    def validate(self, topic: str, payload: dict) -> bool:
        if not self.enabled:
            return True
        
        expected_fields = self.schemas.get(topic)
        if not expected_fields:
            return True # Unknown topic, pass it for now
            
        for field in expected_fields:
            if field not in payload:
                logger.error(f"Schema validation failed for topic {topic}: Missing field {field}")
                return False
        return True

validator = SchemaValidator()

async def consume_all_topics():
    logger.info(f"Starting global Audit Kafka Sink on {settings.KAFKA_BOOTSTRAP_SERVERS}")
    if settings.SCHEMA_REGISTRY_URL:
        logger.info(f"Schema Registry integration active: {settings.SCHEMA_REGISTRY_URL}")
    
    topics = [
        "shipment.created",
        "custody.handoff",
        "sensor.ingested",
        "ml.inference.completed",
        "alert.created",
        "merkle.committed",
        "bitcoin.anchored"
    ]
    
    consumer = AIOKafkaConsumer(
        *topics,
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id="audit-sink-group",
        value_deserializer=lambda x: json.loads(x.decode("utf-8")),
        auto_offset_reset="earliest",
    )
    
    await consumer.start()
    try:
        async for msg in consumer:
            logger.debug(f"Audit log received: {msg.topic} -> {msg.value}")
            try:
                if validator.validate(msg.topic, msg.value):
                    await persist_audit_log(msg.topic, msg.value)
                else:
                    # Schema mismatch is a poison-message signal — route to
                    # DLQ rather than silently dropping. An auditor needs to
                    # see what got dropped and why.
                    await _publish_to_dlq(
                        msg.topic,
                        msg.value,
                        ValueError("schema validation failed"),
                    )
            except Exception as e:
                logger.exception(f"Processing failed for {msg.topic}: {e}")
                await _publish_to_dlq(msg.topic, msg.value, e)
    except Exception as e:
        logger.error(f"Error consuming messages: {e}")
    finally:
        await consumer.stop()
        if _dlq_producer is not None:
            try:
                await _dlq_producer.stop()
            except Exception:
                pass

async def persist_audit_log(topic: str, payload: dict):
    async with AsyncSessionLocal() as session:
        try:
            audit_log = AuditLog(
                topic=topic,
                payload=payload
            )
            session.add(audit_log)
            await session.commit()
            logger.debug(f"Successfully persisted audit log for topic {topic}")
        except Exception as e:
            logger.error(f"Failed to persist audit log: {e}")
            await session.rollback()
