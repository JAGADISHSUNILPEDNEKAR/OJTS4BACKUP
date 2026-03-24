import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from core.config import settings
import httpx

logger = logging.getLogger(__name__)

async def dispatch_push_notification(shipment_id: str, severity: str):
    logger.info(f"Simulating Push Notification delivery for shipment {shipment_id} (Severity: {severity})")
    # In a real app, we would make a request to FCM/APNs here
    # async with httpx.AsyncClient() as client:
    #     await client.post("https://fcm.googleapis.com/fcm/send", json={...})
    pass

async def dispatch_alert(shipment_id: str, score: float, severity: str):
    logger.info(f"Dispatching notifications for shipment {shipment_id} with severity {severity}")
    
    # 1. Dispatch Push Notification
    await dispatch_push_notification(shipment_id, severity)
    
    # 2. Dispatch Email via SendGrid
    if settings.SENDGRID_API_KEY != "SG.mock":
        try:
            message = Mail(
                from_email='alerts@origin.app',
                to_emails='admin@origin.app',
                subject=f'Origin Alert for Shipment {shipment_id}',
                html_content=f'<strong>Alert!</strong> Score {score} triggered severity: {severity}.'
            )
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            response = sg.send(message)
            logger.info(f"Email sent with status code: {response.status_code}")
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
    else:
        logger.info("SENDGRID_API_KEY is mock. Skipping real email dispatch.")
