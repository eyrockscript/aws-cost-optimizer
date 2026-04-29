resource "aws_apigatewayv2_api" "this" {
  name          = "${var.project}-${var.environment}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.cors_allow_origins
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "x-api-key"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 50
    throttling_rate_limit  = 20
  }
}

# API key stored in SSM — Lambda authorizer validates it
resource "random_password" "api_key" {
  length  = 40
  special = false
}

resource "aws_ssm_parameter" "api_key" {
  name  = "/${var.project}/${var.environment}/api-key"
  type  = "SecureString"
  value = random_password.api_key.result
}

# Routes and integrations
resource "aws_apigatewayv2_integration" "list_findings" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.list_findings_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "list_findings" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "GET /findings"
  target    = "integrations/${aws_apigatewayv2_integration.list_findings.id}"
}

resource "aws_apigatewayv2_integration" "get_summary" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.get_summary_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_summary" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "GET /summary"
  target    = "integrations/${aws_apigatewayv2_integration.get_summary.id}"
}

resource "aws_apigatewayv2_integration" "dismiss_finding" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.dismiss_finding_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "dismiss_finding" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "POST /findings/{id}/dismiss"
  target    = "integrations/${aws_apigatewayv2_integration.dismiss_finding.id}"
}

# Lambda permissions
resource "aws_lambda_permission" "list_findings" {
  statement_id  = "AllowAPIGWListFindings"
  action        = "lambda:InvokeFunction"
  function_name = var.list_findings_invoke_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_summary" {
  statement_id  = "AllowAPIGWGetSummary"
  action        = "lambda:InvokeFunction"
  function_name = var.get_summary_invoke_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "dismiss_finding" {
  statement_id  = "AllowAPIGWDismissFinding"
  action        = "lambda:InvokeFunction"
  function_name = var.dismiss_finding_invoke_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}
