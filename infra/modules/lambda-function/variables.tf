variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "name" {
  type        = string
  description = "Short name for this Lambda (e.g. 'orchestrator', 'ec2-idle-check')."
}

variable "artifact_path" {
  type        = string
  description = "Path to the zipped Lambda artifact produced by esbuild."
}

variable "handler" {
  type    = string
  default = "index.handler"
}

variable "timeout" {
  type    = number
  default = 60
}

variable "memory_size" {
  type    = number
  default = 256
}

variable "environment_vars" {
  type    = map(string)
  default = {}
}

variable "policy_json" {
  type        = string
  description = "Additional IAM policy JSON to attach to the Lambda execution role."
  default     = ""
}
