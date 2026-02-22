import json
import logging
from aiokafka import AIOKafkaConsumer

from config import settings
from database import AsyncSessionLocal
from models import AuditLog

logger = logging.getLogger("audit-reporting.consumer")

async def consume_all_topics():
    logger.info(f"Starting global Audit Kafka Sink on {settings.KAFKA_BOOTSTRAP_SERVERS}")
    
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
            await persist_audit_log(msg.topic, msg.value)
    except Exception as e:
        logger.error(f"Error consuming messages: {e}")
    finally:
        await consumer.stop()

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
