locals {
  function_name = "${var.project}-${var.environment}-${var.name}"
}

resource "aws_iam_role" "this" {
  name = "${local.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "custom" {
  count  = var.policy_json != "" ? 1 : 0
  name   = "${local.function_name}-policy"
  role   = aws_iam_role.this.id
  policy = var.policy_json
}

resource "aws_sqs_queue" "dlq" {
  name                      = "${local.function_name}-dlq"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 14
}

resource "aws_lambda_function" "this" {
  function_name = local.function_name
  role          = aws_iam_role.this.arn
  filename      = var.artifact_path
  handler       = var.handler
  runtime       = "nodejs20.x"
  timeout       = var.timeout
  memory_size   = var.memory_size

  source_code_hash = filebase64sha256(var.artifact_path)

  environment {
    variables = var.environment_vars
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn
  }

  tracing_config {
    mode = "Active"
  }

  depends_on = [aws_cloudwatch_log_group.this]
}

resource "aws_iam_role_policy" "dlq_send" {
  name = "${local.function_name}-dlq-send"
  role = aws_iam_role.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sqs:SendMessage"
      Resource = aws_sqs_queue.dlq.arn
    }]
  })
}
