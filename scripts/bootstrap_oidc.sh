#!/bin/bash

# AWS OIDC Bootstrapping Script for GitHub Actions
# This script performs the manual setup needed for GitHub Actions to authenticate with AWS via OIDC.
# Run this once from your AWS CloudShell or local CLI with administrator credentials.

set -e

# Configuration
AWS_ACCOUNT_ID="896170900409"
REPO_NAME="JAGADISHSUNILPEDNEKAR/OJTS4BACKUP"
ROLE_NAME="github-actions-origin-role"
OIDC_PROVIDER_URL="https://token.actions.githubusercontent.com"
THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"

echo "Checking for OIDC Provider..."
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com" 2>/dev/null; then
    echo "OIDC Provider already exists."
else
    echo "Creating OIDC Provider..."
    aws iam create-open-id-connect-provider \
        --url "$OIDC_PROVIDER_URL" \
        --client-id-list "sts.amazonaws.com" \
        --thumbprint-list "$THUMBPRINT"
fi

echo "Preparing Trust Policy..."
TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${REPO_NAME}:*"
        }
      }
    }
  ]
}
EOF
)

echo "Checking for IAM Role: $ROLE_NAME..."
if aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null; then
    echo "Role exists. Updating trust policy..."
    aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "$TRUST_POLICY"
else
    echo "Creating IAM Role: $ROLE_NAME..."
    aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST_POLICY"
fi

echo "Attaching AdministratorAccess for bootstrapping (WARNING: Reduce this later in Terraform)..."
# In a real environment, we should attach minimal policies, but for bootstrapping
# we often need more permissions to allow the CI to create everything else.
# The project's Terraform file defines granular policies which will be applied once the role is used.
aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"

echo "----------------------------------------------------"
echo "OIDC Bootstrapping Complete!"
echo "Role ARN: arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"
echo "You can now re-run your GitHub Actions workflow."
echo "----------------------------------------------------"
