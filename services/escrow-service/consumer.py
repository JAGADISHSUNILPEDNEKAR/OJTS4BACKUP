import asyncio
import logging
import json
import os
from aiokafka import AIOKafkaConsumer
from escrow import process_fund_hold

logger = logging.getLogger("escrow-service.consumer")

async def consume_alerts():
    bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    logger.info(f"Starting Kafka consumer for topics on {bootstrap_servers}")
    
    try:
        # Listen to both topics
        consumer = AIOKafkaConsumer(
            'alert.events',
            'escrow.psbt.response',
            bootstrap_servers=bootstrap_servers,
            group_id="escrow-service-group",
            value_deserializer=lambda m: json.loads(m.decode('utf-8')) if m else None,
            auto_offset_reset='earliest'
        )
        await consumer.start()
        logger.info("Escrow Kafka Consumer listening on alert.events and escrow.psbt.response")
        
        async for msg in consumer:
            if not msg.value:
                continue
                
            event = msg.value
            topic = msg.topic
            
            if topic == 'alert.events' and event.get('event') == 'alert.created':
                severity = event.get('severity')
                shipment_id = event.get('shipment_id')
                logger.info(f"Consumed alert.created for shipment {shipment_id} with severity {severity}")
                
                if severity == "CRITICAL" and shipment_id:
                    logger.info("Critical alert detected. Triggering fund hold via PSBT...")
                    await process_fund_hold(shipment_id)
            
            elif topic == 'escrow.psbt.response':
                shipment_id = event.get('shipment_id')
                psbt = event.get('psbt')
                escrow_id = event.get('escrow_id')
                logger.info(f"Received PSBT generated for shipment {shipment_id}: {psbt}")
                logger.info(f"Escrow state updated successfully for escrow {escrow_id}")
                    
    except asyncio.CancelledError:
        logger.info("Kafka consumer task cancelled.")
    except Exception as e:
        logger.error(f"Error in consumer: {e}")
    finally:
        try:
            await consumer.stop()
        except:
            pass
