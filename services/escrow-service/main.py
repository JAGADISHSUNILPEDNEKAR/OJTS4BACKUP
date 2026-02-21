from fastapi import FastAPI
import logging
# from kafka import KafkaConsumer

app = FastAPI(title="Origin Escrow Service")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("escrow-service")

@app.post("/api/v1/escrow/dispute")
async def flag_dispute(shipment_id: str):
    logger.info(f"Flagging dispute for shipment {shipment_id}")
    return {"status": "DISPUTED", "shipment_id": shipment_id}

# TODO: Consumer for `alert.created` to flag disputes automatically.
# TODO: APIs to trigger PSBT flow via Crypto Service.
