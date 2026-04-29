output "cloudfront_url" { value = "https://${aws_cloudfront_distribution.dashboard.domain_name}" }
output "s3_bucket_name" { value = aws_s3_bucket.dashboard.id }
output "distribution_id" { value = aws_cloudfront_distribution.dashboard.id }
