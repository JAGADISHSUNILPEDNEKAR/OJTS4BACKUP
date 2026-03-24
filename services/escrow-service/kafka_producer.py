import asyncio
import logging
import json
import os
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

async def close_producer():
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None
