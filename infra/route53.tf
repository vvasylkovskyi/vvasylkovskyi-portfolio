resource "aws_route53_zone" "main" {
  name = "vvasylkovskyi.com"
}

resource "aws_route53_record" "origin" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "origin.vvasylkovskyi.com"
  type    = "A"
  ttl     = 300

  records = [aws_eip.portfolio.public_ip]
}

resource "aws_route53_record" "www_https" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.vvasylkovskyi.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}
