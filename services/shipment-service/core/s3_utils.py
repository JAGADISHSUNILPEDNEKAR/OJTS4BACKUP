import boto3
import logging
from botocore.exceptions import ClientError
from core.config import settings

logger = logging.getLogger(__name__)

def get_s3_client():
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
    return boto3.client("s3", region_name=settings.AWS_REGION)

def upload_to_s3(file_content: bytes, bucket_name: str, object_name: str) -> bool:
    """Uploads bytes content to an S3 bucket"""
    s3_client = get_s3_client()
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=object_name,
            Body=file_content
        )
        return True
    except ClientError as e:
        logger.error(f"Error uploading to S3: {e}")
        raise e
