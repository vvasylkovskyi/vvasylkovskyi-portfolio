resource "aws_route53_zone" "main" {
  name = "vvasylkovskyi.com"
}

resource "aws_route53_record" "notes_https" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "notes.vvasylkovskyi.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}
