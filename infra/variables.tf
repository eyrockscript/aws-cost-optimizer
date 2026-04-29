variable "aws_region" {
  type        = string
  description = "AWS region to deploy resources into."
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "aws_region must be a valid AWS region identifier (e.g. us-east-1)."
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev or prod)."

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be 'dev' or 'prod'."
  }
}

variable "aws_account_id" {
  type        = string
  description = "AWS account ID — used for IAM trust policies and resource ARN construction."

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id must be a 12-digit numeric string."
  }
}

variable "github_repo" {
  type        = string
  description = "GitHub repository in 'owner/repo' format — used for OIDC trust policy."
  default     = "eyrockscript/aws-cost-optimizer"

  validation {
    condition     = can(regex("^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$", var.github_repo))
    error_message = "github_repo must be in 'owner/repo' format."
  }
}

variable "scan_schedule" {
  type        = string
  description = "EventBridge cron expression for the daily scan."
  default     = "cron(0 2 * * ? *)"
}

variable "sns_alert_email" {
  type        = string
  description = "Email address to receive CloudWatch alarm notifications."

  validation {
    condition     = can(regex("^[^@]+@[^@]+\\.[^@]+$", var.sns_alert_email))
    error_message = "sns_alert_email must be a valid email address."
  }
}

variable "findings_ttl_days" {
  type        = number
  description = "Number of days to retain dismissed findings before DynamoDB TTL removes them."
  default     = 90

  validation {
    condition     = var.findings_ttl_days >= 7 && var.findings_ttl_days <= 365
    error_message = "findings_ttl_days must be between 7 and 365."
  }
}
