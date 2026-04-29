output "function_arn" {
  value = aws_lambda_function.this.arn
}

output "function_name" {
  value = aws_lambda_function.this.function_name
}

output "role_arn" {
  value = aws_iam_role.this.arn
}

output "role_name" {
  value = aws_iam_role.this.name
}

output "dlq_arn" {
  value = aws_sqs_queue.dlq.arn
}

output "invoke_arn" {
  value = aws_lambda_function.this.invoke_arn
}
