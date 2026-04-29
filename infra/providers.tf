terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.42"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    # Configured via -backend-config or envs/*.tfbackend
    # Bootstrap: see infra/README.md
    bucket         = "aws-cost-optimizer-tf-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "aws-cost-optimizer-tf-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "aws-cost-optimizer"
      Environment = var.environment
      ManagedBy   = "terraform"
      Repository  = "https://github.com/eyrockscript/aws-cost-optimizer"
    }
  }
}
