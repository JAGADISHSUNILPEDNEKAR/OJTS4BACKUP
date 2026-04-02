# GitHub Actions OIDC Provider (Imported from manual bootstrapping)
import {
  to = aws_iam_openid_connect_provider.github
  id = "arn:aws:iam::896170900409:oidc-provider/token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"] # GitHub's OIDC certificate thumbprint
}

# IAM Role for GitHub Actions (Imported from manual bootstrapping)
import {
  to = aws_iam_role.github_actions_role
  id = "github-actions-origin-role"
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions_role" {
  name = "github-actions-origin-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:JAGADISHSUNILPEDNEKAR/OJTS4BACKUP:*"
          }
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "GitHubActionsRole"
    Environment = "staging"
  }
}

# Permission policy for ECR Access
resource "aws_iam_role_policy" "ecr_policy" {
  name = "github-actions-ecr-policy"
  role = aws_iam_role.github_actions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetRepositoryPolicy",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# Permission policy for Basic EKS Read (to deploy)
resource "aws_iam_role_policy" "eks_policy" {
  name = "github-actions-eks-policy"
  role = aws_iam_role.github_actions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters"
        ]
        Resource = "*"
      }
    ]
  })
}

# Permission policy for Terraform State Access (S3 & DynamoDB)
resource "aws_iam_role_policy" "terraform_state_policy" {
  name = "github-actions-terraform-state-policy"
  role = aws_iam_role.github_actions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = "arn:aws:s3:::origin-terraform-state-896170900409"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::origin-terraform-state-896170900409/infra/terraform.tfstate"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:896170900409:table/origin-terraform-locks"
      }
    ]
  })
}

# Output the Role ARN
output "github_actions_role_arn" {
  description = "The ARN of the IAM Role for GitHub Actions"
  value       = aws_iam_role.github_actions_role.arn
}
