import asyncio
import logging
import json
import os
from aiokafka import AIOKafkaConsumer
from escrow import process_fund_hold

logger = logging.getLogger("escrow-service.consumer")

async def consume_alerts():
    bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    logger.info(f"Starting Kafka consumer for topic 'alert.events' on {bootstrap_servers}")
    
    try:
        consumer = AIOKafkaConsumer(
            'alert.events',
            bootstrap_servers=bootstrap_servers,
            group_id="escrow-service-group",
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest'
        )
        await consumer.start()
        logger.info("Escrow Kafka Consumer listening on alert.events")
        
        async for msg in consumer:
            event = msg.value
            if event.get('event') == 'alert.created':
                severity = event.get('severity')
                shipment_id = event.get('shipment_id')
                logger.info(f"Consumed alert.created for shipment {shipment_id} with severity {severity}")
                
                if severity == "CRITICAL" and shipment_id:
                    logger.info("Critical alert detected. Triggering fund hold via PSBT...")
                    await process_fund_hold(shipment_id)
                    
    except asyncio.CancelledError:
        logger.info("Kafka consumer task cancelled.")
    finally:
        try:
            await consumer.stop()
        except:
            pass
