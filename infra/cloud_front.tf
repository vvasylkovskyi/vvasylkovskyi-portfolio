# resource "aws_cloudfront_distribution" "cdn" {
#   # depends_on = [aws_acm_certificate_validation.cert]
#   enabled             = true
#   default_root_object = "index.html"

#   origin {
#     domain_name = aws_instance.portfolio.public_dns
#     origin_id   = aws_instance.portfolio.public_dns

#     custom_origin_config {
#       http_port              = 80
#       https_port             = 443
#       origin_protocol_policy = "http-only"
#       origin_ssl_protocols   = ["TLSv1.2"]
#     }
#   }

#   default_cache_behavior {
#     allowed_methods  = ["GET", "HEAD"]
#     cached_methods   = ["GET", "HEAD"]
#     target_origin_id = aws_instance.portfolio.public_dns

#     forwarded_values {
#       query_string = false
#       cookies {
#         forward = "none"
#       }
#     }

#     viewer_protocol_policy = "allow-all"
#     min_ttl                = 0
#     default_ttl            = 3600
#     max_ttl                = 86400
#   }

#   price_class = "PriceClass_100"

#   viewer_certificate {
#     # acm_certificate_arn      = aws_acm_certificate.cert.arn
#     # ssl_support_method       = "sni-only"
#     # minimum_protocol_version = "TLSv1.2_2021"
#     cloudfront_default_certificate = true

#   }

#   restrictions {
#     geo_restriction {
#       restriction_type = "none"
#     }
#   }
# }
