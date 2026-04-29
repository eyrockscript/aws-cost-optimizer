output "api_url" {
  description = "Base URL of the HTTP API Gateway endpoint."
  value       = module.api_gateway.api_url
}

output "dashboard_url" {
  description = "CloudFront URL of the React dashboard."
  value       = module.frontend_hosting.cloudfront_url
}

output "api_key_ssm_path" {
  description = "SSM Parameter Store path where the API key is stored."
  value       = module.api_gateway.api_key_ssm_path
  sensitive   = true
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for CloudWatch alarm notifications."
  value       = aws_sns_topic.alerts.arn
}

output "findings_table_name" {
  description = "Name of the DynamoDB findings table."
  value       = module.dynamodb_findings.table_name
}

output "findings_table_arn" {
  description = "ARN of the DynamoDB findings table."
  value       = module.dynamodb_findings.table_arn
}
