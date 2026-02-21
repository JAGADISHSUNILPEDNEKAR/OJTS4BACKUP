# S3 Buckets for Origin Storage

locals {
  buckets = [
    "origin-${var.environment}-manifests",
    "origin-${var.environment}-kyc",
    "origin-${var.environment}-models",
    "origin-${var.environment}-proofs"
  ]
}

resource "aws_s3_bucket" "origin_buckets" {
  count  = length(local.buckets)
  bucket = local.buckets[count.index]

  tags = {
    Environment = var.environment
    Name        = local.buckets[count.index]
  }
}

# Block public access by default
resource "aws_s3_bucket_public_access_block" "origin_buckets_block" {
  count  = length(aws_s3_bucket.origin_buckets)
  bucket = aws_s3_bucket.origin_buckets[count.index].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enforce Server Side Encryption (SSE-S3)
resource "aws_s3_bucket_server_side_encryption_configuration" "origin_buckets_crypto" {
  count  = length(aws_s3_bucket.origin_buckets)
  bucket = aws_s3_bucket.origin_buckets[count.index].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
