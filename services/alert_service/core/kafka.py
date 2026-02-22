import json
import logging
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from core.config import settings
from evaluator.threshold import evaluate
from notifications.dispatcher import dispatch_alert

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

async def consume_ml_results():
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
            if event.get('event') == 'ml.inference.completed':
                score = event.get('score', 0.0)
                shipment_id = event.get('shipment_id')
                
                if not shipment_id:
                    continue
                    
                is_alert = await evaluate(score)
                if is_alert:
                    severity = "CRITICAL" if score > 0.9 else "WARNING"
                    await dispatch_alert(shipment_id, score, severity)
                    
                    alert_event = {
                        "event": "alert.created",
                        "shipment_id": shipment_id,
                        "severity": severity,
                        "score": score
                    }
                    if producer:
                        await producer.send_and_wait('alert.events', alert_event)
                        logger.info(f"Published alert.created for shipment {shipment_id}")
    finally:
        await consumer.stop()
