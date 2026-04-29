variable "project" { type = string }
variable "environment" { type = string }
variable "schedule_expression" { type = string }
variable "target_lambda_arn" { type = string }
variable "enabled" {
  type    = bool
  default = true
}
