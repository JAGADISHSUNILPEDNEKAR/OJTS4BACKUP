import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from ..core.config import settings

logger = logging.getLogger(__name__)

async def dispatch_alert(shipment_id: str, score: float, severity: str):
    logger.info(f"Dispatching notifications for shipment {shipment_id} with severity {severity}")
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
