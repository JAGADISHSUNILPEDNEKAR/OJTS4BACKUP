import json
import logging
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from .config import settings
from ..features.extractor import extract_features
from ..models.inference import inference_engine

logger = logging.getLogger(__name__)

producer: AIOKafkaProducer = None

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
                logger.warning("Event missing shipment_id or id")
                continue
                
            if msg.topic == 'sensor.ingested':
                try:
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
                except Exception as e:
                    logger.error(f"Error processing sensor.ingested: {str(e)}")
            elif msg.topic in ['shipment.created', 'custody.handoff']:
                logger.info(f"Received {msg.topic} for shipment {shipment_id}, internal routing graph updated.")
    finally:
        await consumer.stop()
