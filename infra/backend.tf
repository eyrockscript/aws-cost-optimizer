# Remote state backend configuration.
#
# Bootstrap the S3 bucket and DynamoDB lock table ONCE before first apply:
#
#   aws s3api create-bucket \
#     --bucket aws-cost-optimizer-tf-state \
#     --region us-east-1
#
#   aws s3api put-bucket-versioning \
#     --bucket aws-cost-optimizer-tf-state \
#     --versioning-configuration Status=Enabled
#
#   aws s3api put-bucket-encryption \
#     --bucket aws-cost-optimizer-tf-state \
#     --server-side-encryption-configuration \
#       '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
#
#   aws dynamodb create-table \
#     --table-name aws-cost-optimizer-tf-lock \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST \
#     --region us-east-1
#
# For local development with LocalStack, use:
#   terraform init -backend=false
