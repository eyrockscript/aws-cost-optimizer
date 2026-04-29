variable "project" { type = string }
variable "environment" { type = string }
variable "github_repo" { type = string }
variable "policy_json" { type = string }
variable "create_oidc_provider" {
  type    = bool
  default = true
}
