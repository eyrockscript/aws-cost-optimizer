locals {
  project     = "aws-cost-optimizer"
  environment = var.environment
  check_names = ["ec2-idle", "ebs-orphan", "eip-unassoc", "rds-underutilized", "snapshots-old", "nat-gw-low-traffic", "lambda-overprovisioned"]
}

# ─── SNS Topic for Alerts ────────────────────────────────────────────────────

resource "aws_sns_topic" "alerts" {
  name = "${local.project}-${local.environment}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.sns_alert_email
}

# ─── DynamoDB ────────────────────────────────────────────────────────────────

module "dynamodb_findings" {
  source      = "./modules/dynamodb-findings"
  project     = local.project
  environment = local.environment
  enable_pitr = local.environment == "prod"
}

# ─── SQS Queues (one per check) ──────────────────────────────────────────────

module "sqs" {
  for_each    = toset(local.check_names)
  source      = "./modules/sqs-with-dlq"
  project     = local.project
  environment = local.environment
  name        = each.key
  # Visibility timeout = 2× Lambda timeout (60s workers)
  visibility_timeout_seconds = 120
}

# ─── Worker Lambdas ──────────────────────────────────────────────────────────

module "worker" {
  for_each      = toset(local.check_names)
  source        = "./modules/lambda-function"
  project       = local.project
  environment   = local.environment
  name          = "${each.key}-check"
  artifact_path = "../services/dist/handlers/checks/${each.key}.zip"
  handler       = "index.handler"
  timeout       = 60
  memory_size   = 256

  environment_vars = {
    FINDINGS_TABLE = module.dynamodb_findings.table_name
    ENVIRONMENT    = local.environment
    LOG_LEVEL      = local.environment == "prod" ? "WARN" : "DEBUG"
  }

  policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:GetItem"
        ]
        Resource = [
          module.dynamodb_findings.table_arn,
          "${module.dynamodb_findings.table_arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:Describe*", "rds:Describe*",
          "cloudwatch:GetMetricStatistics", "cloudwatch:PutMetricData",
          "lambda:ListFunctions", "lambda:GetFunctionConfiguration"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "sqs:DeleteMessage"
        Resource = module.sqs[each.key].queue_arn
      }
    ]
  })
}

# Event Source Mappings: SQS → Workers
resource "aws_lambda_event_source_mapping" "worker" {
  for_each         = toset(local.check_names)
  event_source_arn = module.sqs[each.key].queue_arn
  function_name    = module.worker[each.key].function_arn
  batch_size       = 1
}

# ─── Orchestrator Lambda ──────────────────────────────────────────────────────

module "orchestrator" {
  source        = "./modules/lambda-function"
  project       = local.project
  environment   = local.environment
  name          = "orchestrator"
  artifact_path = "../services/dist/handlers/orchestrator.zip"
  handler       = "index.handler"
  timeout       = 30
  memory_size   = 128

  environment_vars = merge(
    { for name in local.check_names :
      upper(replace(replace(name, "-", "_"), ".", "_")) => module.sqs[name].queue_url
    },
    {
      ENVIRONMENT = local.environment
      LOG_LEVEL   = local.environment == "prod" ? "WARN" : "DEBUG"
    }
  )

  policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sqs:SendMessage"
      Resource = [for name in local.check_names : module.sqs[name].queue_arn]
    }]
  })
}

# ─── EventBridge ─────────────────────────────────────────────────────────────

module "eventbridge" {
  source              = "./modules/eventbridge-cron"
  project             = local.project
  environment         = local.environment
  schedule_expression = var.scan_schedule
  target_lambda_arn   = module.orchestrator.function_arn
}

# ─── API Handler Lambdas ──────────────────────────────────────────────────────

locals {
  api_handlers = {
    list-findings   = { path = "list-findings", method = "GET" }
    get-summary     = { path = "get-summary", method = "GET" }
    dismiss-finding = { path = "dismiss-finding", method = "POST" }
  }
  api_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:Query", "dynamodb:GetItem",
        "dynamodb:PutItem", "dynamodb:UpdateItem"
      ]
      Resource = [
        module.dynamodb_findings.table_arn,
        "${module.dynamodb_findings.table_arn}/index/*"
      ]
    }]
  })
}

module "api_list_findings" {
  source        = "./modules/lambda-function"
  project       = local.project
  environment   = local.environment
  name          = "api-list-findings"
  artifact_path = "../services/dist/handlers/api/list-findings.zip"
  timeout       = 15
  memory_size   = 128
  environment_vars = {
    FINDINGS_TABLE = module.dynamodb_findings.table_name
    API_KEY_PARAM  = "/${local.project}/${local.environment}/api-key"
    ENVIRONMENT    = local.environment
  }
  policy_json = local.api_policy
}

module "api_get_summary" {
  source        = "./modules/lambda-function"
  project       = local.project
  environment   = local.environment
  name          = "api-get-summary"
  artifact_path = "../services/dist/handlers/api/get-summary.zip"
  timeout       = 15
  memory_size   = 128
  environment_vars = {
    FINDINGS_TABLE = module.dynamodb_findings.table_name
    API_KEY_PARAM  = "/${local.project}/${local.environment}/api-key"
    ENVIRONMENT    = local.environment
  }
  policy_json = local.api_policy
}

module "api_dismiss_finding" {
  source        = "./modules/lambda-function"
  project       = local.project
  environment   = local.environment
  name          = "api-dismiss-finding"
  artifact_path = "../services/dist/handlers/api/dismiss-finding.zip"
  timeout       = 15
  memory_size   = 128
  environment_vars = {
    FINDINGS_TABLE = module.dynamodb_findings.table_name
    API_KEY_PARAM  = "/${local.project}/${local.environment}/api-key"
    FINDINGS_TTL_DAYS = tostring(var.findings_ttl_days)
    ENVIRONMENT    = local.environment
  }
  policy_json = local.api_policy
}

# ─── API Gateway ─────────────────────────────────────────────────────────────

module "api_gateway" {
  source                     = "./modules/api-gateway-http"
  project                    = local.project
  environment                = local.environment
  list_findings_invoke_arn   = module.api_list_findings.invoke_arn
  get_summary_invoke_arn     = module.api_get_summary.invoke_arn
  dismiss_finding_invoke_arn = module.api_dismiss_finding.invoke_arn
  cors_allow_origins         = local.environment == "prod" ? [module.frontend_hosting.cloudfront_url] : ["*"]
}

# ─── Frontend Hosting ─────────────────────────────────────────────────────────

module "frontend_hosting" {
  source         = "./modules/frontend-hosting"
  project        = local.project
  environment    = local.environment
  aws_account_id = var.aws_account_id
}

# ─── GitHub Actions OIDC ──────────────────────────────────────────────────────

module "github_oidc" {
  source      = "./modules/github-oidc"
  project     = local.project
  environment = local.environment
  github_repo = var.github_repo

  policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode", "lambda:GetFunction",
          "s3:PutObject", "s3:DeleteObject", "s3:ListBucket",
          "cloudfront:CreateInvalidation",
          "terraform:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# ─── CloudWatch Alarms ────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "dlq_depth" {
  for_each            = toset(local.check_names)
  alarm_name          = "${local.project}-${local.environment}-${each.key}-dlq-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Messages landing in ${each.key} DLQ — check Lambda logs."
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = "${local.project}-${local.environment}-${each.key}-dlq"
  }
}
