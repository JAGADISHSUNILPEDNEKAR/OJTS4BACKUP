import asyncio
import logging
import json
import os
from aiokafka import AIOKafkaConsumer
from escrow import process_fund_hold, PSBTTriggerRequest

logger = logging.getLogger("escrow-service.consumer")

async def consume_alerts():
    bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    logger.info(f"Starting Kafka consumer for topics on {bootstrap_servers}")
    
    try:
        # Listen to relevant topics
        consumer = AIOKafkaConsumer(
            'alert.events',
            'escrow.psbt.response',
            'escrow.psbt.request',
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
                    # Mocking the rest of the request for critical alert trigger
                    # In a real scenario, we'd fetch these from the DB or another service
                    mock_req = PSBTTriggerRequest(
                        shipment_id=shipment_id,
                        amount_usd=100.0,
                        amount_btc=0.001,
                        buyer_id="auto-buyer",
                        seller_id="auto-seller",
                        buyer_pubkey="0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352",
                        seller_pubkey="03b01a1c93a9d4a6f23f5b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b"
                    )
                    await process_fund_hold(mock_req)
            
            elif topic == 'escrow.psbt.request':
                logger.info(f"Consumed escrow.psbt.request for shipment {event.get('shipment_id')}")
                try:
                    req = PSBTTriggerRequest(**event)
                    await process_fund_hold(req)
                except Exception as e:
                    logger.error(f"Failed to parse or process PSBTTriggerRequest: {e}")

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
