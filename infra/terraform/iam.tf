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
      {
        Effect = "Allow",
        Action = [
          "s3:*",
          "dynamodb:*",
          "iam:*",
          "route53:*",
          "secretsmanager:*",
          "rds:*",
          "ec2:*",
          "cloudwatch:*",
          "logs:*"
        ],
        Resource = "*"
      }
    ]
  })
}

# Attach Policy to IAM User
resource "aws_iam_user_policy_attachment" "attach_policy" {
  user       = aws_iam_user.iam_user.name
  policy_arn = aws_iam_policy.terraform_deployer_policy.arn
}
