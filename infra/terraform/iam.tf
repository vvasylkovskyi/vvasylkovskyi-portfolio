data "aws_caller_identity" "current" {}

# IAM User
resource "aws_iam_user" "iam_user" {
  name = var.iam_user
}

# IAM Access Key
resource "aws_iam_access_key" "iam_user_key" {
  user = aws_iam_user.iam_user.name
}

# (Optional) IAM Console login
resource "aws_iam_user_login_profile" "iam_user_console" {
  user = aws_iam_user.iam_user.name
}

# IAM Policy for Terraform deployment
resource "aws_iam_policy" "terraform_deployer_policy" {
  name        = "terraform_deployer_policy"
  description = "Least privilege policy for Terraform infrastructure management"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      # EC2, VPC, Security Groups
      {
        Effect = "Allow",
        Action = [
          "ec2:Describe*",
          "ec2:Create*",
          "ec2:Delete*",
          "ec2:Modify*",
          "ec2:Associate*",
          "ec2:Disassociate*",
          "ec2:Attach*",
          "ec2:Detach*",
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupIngress",
          "ec2:AuthorizeSecurityGroupEgress",
          "ec2:RevokeSecurityGroupEgress"
        ],
        Resource = "*"
      },

      # RDS
      {
        Effect = "Allow",
        Action = [
          "rds:Describe*",
          "rds:CreateDBInstance",
          "rds:DeleteDBInstance",
          "rds:ModifyDBInstance",
          "rds:StartDBInstance",
          "rds:StopDBInstance",
          "rds:CreateDBSubnetGroup",
          "rds:DeleteDBSubnetGroup",
          "rds:ModifyDBSubnetGroup"
        ],
        Resource = "*"
      },

      # Load Balancer
      {
        Effect = "Allow",
        Action = [
          "elasticloadbalancing:*"
        ],
        Resource = "*"
      },

      # ACM
      {
        Effect = "Allow",
        Action = [
          "acm:DescribeCertificate",
          "acm:ListCertificates",
          "acm:RequestCertificate",
          "acm:DeleteCertificate"
        ],
        Resource = "*"
      },

      # Route 53
      {
        Effect = "Allow",
        Action = [
          "route53:ChangeResourceRecordSets",
          "route53:GetHostedZone",
          "route53:ListHostedZones",
          "route53:ListResourceRecordSets"
        ],
        Resource = "*"
      },

      # Secrets Manager
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:CreateSecret",
          "secretsmanager:UpdateSecret",
          "secretsmanager:DeleteSecret",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecrets"
        ],
        Resource = "*"
      },

      # Terraform S3 Backend
      {
        Effect = "Allow",
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ],
        Resource = [
          "arn:aws:s3:::${var.backend_bucket}",
          "arn:aws:s3:::${var.backend_bucket}/*"
        ]
      },

      # Terraform DynamoDB Lock Table
      {
        Effect = "Allow",
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:UpdateItem",
          "dynamodb:DescribeTable"
        ],
        Resource = "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.lock_table}"
      }
    ]
  })
}

# Attach Policy to IAM User
resource "aws_iam_user_policy_attachment" "attach_policy" {
  user       = aws_iam_user.iam_user.name
  policy_arn = aws_iam_policy.terraform_deployer_policy.arn
}
