aws_region     = "us-east-1"
environment    = "prod"
aws_account_id = "123456789012"
github_repo    = "eyrockscript/aws-cost-optimizer"

scan_schedule    = "cron(0 6 * * ? *)"
sns_alert_email  = "dev.eliud.trejo@gmail.com"
findings_ttl_days = 90
