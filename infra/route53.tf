resource "aws_route53_zone" "main" {
  name = "vvasylkovskyi.com"
}

resource "aws_route53_record" "www_https" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.vvasylkovskyi.com"
  type    = "A"

  alias {
    name                   = aws_lb.portfolio.dns_name
    zone_id                = aws_lb.portfolio.zone_id
    evaluate_target_health = true
  }
}