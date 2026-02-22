import asyncio
import logging
import json

logger = logging.getLogger("escrow-service.consumer")

async def consume_alerts():
    logger.info("Starting mock Kafka consumer for topic 'alert.created'")
    try:
        while True:
            # Mocking the Kafka polling cycle
            await asyncio.sleep(60)
            logger.debug("Polling alert.created...")
    except asyncio.CancelledError:
        logger.info("Kafka consumer task cancelled.")
