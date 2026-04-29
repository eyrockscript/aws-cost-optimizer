variable "project" { type = string }
variable "environment" { type = string }
variable "list_findings_invoke_arn" { type = string }
variable "get_summary_invoke_arn" { type = string }
variable "dismiss_finding_invoke_arn" { type = string }
variable "cors_allow_origins" {
  type    = list(string)
  default = ["*"]
}
