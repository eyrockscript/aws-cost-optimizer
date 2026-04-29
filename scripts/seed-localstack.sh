#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="http://localhost:4566"
REGION="us-east-1"
ACCOUNT_ID="000000000000"
TABLE="findings-dev"

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION="${REGION}"

awslocal() {
  aws --endpoint-url "${ENDPOINT}" "$@"
}

wait_localstack() {
  echo "Waiting for LocalStack..."
  until curl -sf "${ENDPOINT}/_localstack/health" | grep -q '"dynamodb": "running"'; do
    sleep 2
  done
  echo "LocalStack ready."
}

create_dynamodb_table() {
  echo "Creating DynamoDB table: ${TABLE}"
  awslocal dynamodb create-table \
    --table-name "${TABLE}" \
    --attribute-definitions \
      AttributeName=pk,AttributeType=S \
      AttributeName=sk,AttributeType=S \
      AttributeName=gsi1pk,AttributeType=S \
      AttributeName=gsi1sk,AttributeType=S \
    --key-schema \
      AttributeName=pk,KeyType=HASH \
      AttributeName=sk,KeyType=RANGE \
    --global-secondary-indexes '[
      {
        "IndexName": "gsi1",
        "KeySchema": [
          {"AttributeName": "gsi1pk", "KeyType": "HASH"},
          {"AttributeName": "gsi1sk", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
    --billing-mode PAY_PER_REQUEST \
    --region "${REGION}" 2>/dev/null || echo "Table already exists."
}

seed_findings() {
  echo "Seeding findings..."

  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local ttl
  ttl=$(( $(date +%s) + 30 * 86400 ))

  # 1 idle EC2 instance — high savings
  awslocal dynamodb put-item --table-name "${TABLE}" --item '{
    "pk": {"S": "ACCOUNT#000000000000"},
    "sk": {"S": "FINDING#us-east-1#ec2-idle#i-0abc123def456"},
    "gsi1pk": {"S": "STATUS#active"},
    "gsi1sk": {"S": "SAVINGS#000000010800"},
    "accountId": {"S": "000000000000"},
    "region": {"S": "us-east-1"},
    "checkType": {"S": "ec2-idle"},
    "resourceId": {"S": "i-0abc123def456"},
    "title": {"S": "Idle EC2 instance i-0abc123def456 (m5.xlarge)"},
    "detail": {"S": "Average CPU utilization 1.2% over 14 days"},
    "status": {"S": "active"},
    "severity": {"S": "high"},
    "monthlySavingsUsd": {"N": "108.0"},
    "detectedAt": {"S": "'"${now}"'"},
    "ttl": {"N": "'"${ttl}"'"}
  }'

  # 2 orphan EBS volumes
  awslocal dynamodb put-item --table-name "${TABLE}" --item '{
    "pk": {"S": "ACCOUNT#000000000000"},
    "sk": {"S": "FINDING#us-east-1#ebs-orphan#vol-0111aaa"},
    "gsi1pk": {"S": "STATUS#active"},
    "gsi1sk": {"S": "SAVINGS#000000006400"},
    "accountId": {"S": "000000000000"},
    "region": {"S": "us-east-1"},
    "checkType": {"S": "ebs-orphan"},
    "resourceId": {"S": "vol-0111aaa"},
    "title": {"S": "Orphan EBS volume vol-0111aaa (800 GB gp3)"},
    "detail": {"S": "Volume in available state, not attached to any instance"},
    "status": {"S": "active"},
    "severity": {"S": "high"},
    "monthlySavingsUsd": {"N": "64.0"},
    "detectedAt": {"S": "'"${now}"'"},
    "ttl": {"N": "'"${ttl}"'"}
  }'

  awslocal dynamodb put-item --table-name "${TABLE}" --item '{
    "pk": {"S": "ACCOUNT#000000000000"},
    "sk": {"S": "FINDING#us-west-2#ebs-orphan#vol-0222bbb"},
    "gsi1pk": {"S": "STATUS#active"},
    "gsi1sk": {"S": "SAVINGS#000000002400"},
    "accountId": {"S": "000000000000"},
    "region": {"S": "us-west-2"},
    "checkType": {"S": "ebs-orphan"},
    "resourceId": {"S": "vol-0222bbb"},
    "title": {"S": "Orphan EBS volume vol-0222bbb (300 GB gp3)"},
    "detail": {"S": "Volume in available state, not attached to any instance"},
    "status": {"S": "active"},
    "severity": {"S": "medium"},
    "monthlySavingsUsd": {"N": "24.0"},
    "detectedAt": {"S": "'"${now}"'"},
    "ttl": {"N": "'"${ttl}"'"}
  }'

  # 3 unassociated EIPs
  for i in 1 2 3; do
    awslocal dynamodb put-item --table-name "${TABLE}" --item '{
      "pk": {"S": "ACCOUNT#000000000000"},
      "sk": {"S": "FINDING#us-east-1#eip-unassoc#eipalloc-0'"${i}"'xxx"},
      "gsi1pk": {"S": "STATUS#active"},
      "gsi1sk": {"S": "SAVINGS#000000000365"},
      "accountId": {"S": "000000000000"},
      "region": {"S": "us-east-1"},
      "checkType": {"S": "eip-unassoc"},
      "resourceId": {"S": "eipalloc-0'"${i}"'xxx"},
      "title": {"S": "Unassociated EIP eipalloc-0'"${i}"'xxx"},
      "detail": {"S": "Elastic IP address not associated with any instance or NAT gateway"},
      "status": {"S": "active"},
      "severity": {"S": "low"},
      "monthlySavingsUsd": {"N": "3.65"},
      "detectedAt": {"S": "'"${now}"'"},
      "ttl": {"N": "'"${ttl}"'"}
    }'
  done

  # 1 underutilized RDS
  awslocal dynamodb put-item --table-name "${TABLE}" --item '{
    "pk": {"S": "ACCOUNT#000000000000"},
    "sk": {"S": "FINDING#us-east-1#rds-underutilized#db-prod-analytics"},
    "gsi1pk": {"S": "STATUS#active"},
    "gsi1sk": {"S": "SAVINGS#000000014600"},
    "accountId": {"S": "000000000000"},
    "region": {"S": "us-east-1"},
    "checkType": {"S": "rds-underutilized"},
    "resourceId": {"S": "db-prod-analytics"},
    "title": {"S": "Underutilized RDS db-prod-analytics (db.r5.xlarge)"},
    "detail": {"S": "Average CPU 2.3%, max connections 1 over 14 days"},
    "status": {"S": "active"},
    "severity": {"S": "high"},
    "monthlySavingsUsd": {"N": "146.0"},
    "detectedAt": {"S": "'"${now}"'"},
    "ttl": {"N": "'"${ttl}"'"}
  }'

  echo "Seeded 7 findings successfully."
}

wait_localstack
create_dynamodb_table
seed_findings

echo ""
echo "LocalStack seed complete."
echo "  Table: ${TABLE}"
echo "  Findings: 7 (1 ec2-idle, 2 ebs-orphan, 3 eip-unassoc, 1 rds-underutilized)"
echo "  Endpoint: ${ENDPOINT}"
