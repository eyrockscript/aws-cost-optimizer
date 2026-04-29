output "api_url" { value = aws_apigatewayv2_stage.default.invoke_url }
output "api_key_ssm_path" { value = aws_ssm_parameter.api_key.name }
output "api_id" { value = aws_apigatewayv2_api.this.id }
