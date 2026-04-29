variable "project" { type = string }
variable "environment" { type = string }
variable "name" { type = string }
variable "visibility_timeout_seconds" {
  type    = number
  default = 120
}
variable "max_receive_count" {
  type    = number
  default = 3
}
