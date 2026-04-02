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

# DynamoDB Table for Terraform State Locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "origin-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "Terraform State Lock Table"
    Environment = var.environment
  }
}

# Import manually created resources
import {
  to = aws_dynamodb_table.terraform_locks
  id = "origin-terraform-locks"
}

import {
  to = aws_s3_bucket.terraform_state
  id = "origin-terraform-state-896170900409"
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "origin-terraform-state-896170900409"

  tags = {
    Name        = "Terraform State Store"
    Environment = var.environment
  }
}
