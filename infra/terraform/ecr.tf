# Amazon Elastic Container Registry (ECR) for Microservices

locals {
  services = [
    "auth-service",
    "user-service",
    "shipment-service",
    "iot-ingestion-service",
    "ml-service",
    "alert-service",
    "escrow-service",
    "audit-reporting-service",
    "crypto-service",
    "frontend-app"
  ]
}

resource "aws_ecr_repository" "services" {
  for_each = toset(local.services)

  name                 = "origin-${var.environment}-${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Service = each.key
  }
}

# Lifecycle policy to clean up old untagged images and save costs
resource "aws_ecr_lifecycle_policy" "cleanup" {
  for_each = aws_ecr_repository.services

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha-"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
