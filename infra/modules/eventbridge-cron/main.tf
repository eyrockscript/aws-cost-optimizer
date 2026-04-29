resource "aws_cloudwatch_event_rule" "scan" {
  name                = "${var.project}-${var.environment}-daily-scan"
  description         = "Triggers the cost optimizer orchestrator Lambda on a daily schedule."
  schedule_expression = var.schedule_expression
  state               = var.enabled ? "ENABLED" : "DISABLED"
}

resource "aws_cloudwatch_event_target" "orchestrator" {
  rule      = aws_cloudwatch_event_rule.scan.name
  target_id = "orchestrator"
  arn       = var.target_lambda_arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.target_lambda_arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scan.arn
}
