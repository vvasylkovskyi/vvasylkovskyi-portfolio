# Provisioning IAM with Terraform for secure AWS access

One of the main pre-requisites before using AWS CLI via terraform is to have AWS access keys like: 

```sh
export AWS_ACCESS_KEY_ID=
export AWS_SECRET_ACCESS_KEY=
```

These keys can be generated via terraform and is the recommended approach. The way it is done is by using IAM (Identity and Access Management) resouce in AWS. The idea is instead of using AWS root account for the cloud operations, that account is only used as a super admin which does nothing but managing access and identities on the AWS account. This is a more secure approach since we will be creating "identities" for the programmatic access and guarantee the least responsibility principle - the programmatic access is managed by IAM - so not the root account - and with fewer permissions. Hence preventing accidental leakage and a catastrophe. 

In this notes we will write a very small terraform code where we will provision an IAM with access to write and read into a specific S3 bucket. The result of this operation will be also the retrieval of the keys above so that we can use them in our apps for programmatic access.

## Provisioning IAM for S3 access 

Let's write terraform to provision `iam`: 


```hcl
# iam.tf
provider "aws" {
  region = "us-east-1" 
}

resource "aws_iam_user" "my_app_user" {
  name = "my_app_user"
}

resource "aws_iam_policy" "s3_upload_policy" {
  name        = "my_app_s3_upload_policy"
  description = "Allow put/get/list objects in specific bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListAllMyBuckets"
        ]
        Resource = "arn:aws:s3:::*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListAllMyBuckets"
        ]
        Resource = [
          "arn:aws:s3:::your-bucket-name",
          "arn:aws:s3:::your-bucket-name/*"
        ]
      }
    ]
  })
}

# Attach policy to user
resource "aws_iam_user_policy_attachment" "attach_policy" {
  user       = aws_iam_user.my_app_user.name
  policy_arn = aws_iam_policy.s3_upload_policy.arn
}

# Create access keys for the user
resource "aws_iam_access_key" "my_app_user_key" {
  user = aws_iam_user.my_app_user.name
}
```

The way the IAM works is by performing essentially three steps: 

1. First an identity is created. The identity is the *who* - using `aws_iam_user` resource,
2. Then, a policy is created. The policy the *what* - what can be done by whoever has this policy - using `aws_iam_policy` resource,
3. Finally, the policy is given to an identity using `aws_iam_user_policy_attachment`. 

In the last resource we also created `aws_iam_access_key` for the `aws_iam_user`. 

## Adding Outputs

We can also add an output to debug:

```hcl

output "access_key_id" {
  value = aws_iam_access_key.my_app_user_key.id
}

output "secret_access_key" {
  value     = aws_iam_access_key.my_app_user_key.secret
  sensitive = true
}
```

## Execute and create resources

Let's run `terraform init` and `terraform apply --auto-approve` to create the IAM and access keys. You should get output like follows.

```sh
Apply complete! Resources: n added, 0 changed, 0 destroyed.

Outputs:

access_key_id = "YOURKEYID"
secret_access_key = <sensitive>
```

Note that the terraform tries to hide the key to avoid leaking it in system logs of some sort. You can still find the key content by running: 

```sh
terraform output secret_access_key
```

Or by looking into your `terraform.tfstate`. 

## A word on security and remote states

Beware that the state files are storing keys in plain text on purpose. That is why you should avoid storing them in version control. Ideally this files should be managed remotely in S3 using terraform remote state. Read more about how to setup terraform remote state in here: [Saving Terraform State in a Remote Backend on AWS with S3 and DynamoDB](https://www.vvasylkovskyi.com/posts/terraform-state-in-s3-dynamodb-backend). And make sure to use encryption.

## Add a user login 

Terraform’s `aws_iam_user` resource does not support setting a console password directly.

You need to create a separate resource called:

```hcl
resource "aws_iam_user_login_profile" "my_app_user_console" {
  user    = aws_iam_user.my_app_user.name
  password_reset_required = true 
}

output "console_username" {
  value     = aws_iam_user.my_app_user.name
  sensitive = true
  description = "Initial console username for the IAM user"
}

output "console_password" {
  value     = aws_iam_user_login_profile.my_app_user_console.password
  sensitive = true
  description = "Initial console password for the IAM user"
}
```

And finally, we also need `Account ID or alias`. This usually resides in `data "aws_caller_identity" "current" {}`, so lets add it: 

```hcl
data "aws_caller_identity" "current" {}

output "account_id" {
  value       = data.aws_caller_identity.current.account_id
  description = "AWS Account ID"
}
```

You can now login on AWS console using your credentials created here.

## Conclusion

Using Terraform to create IAM users and policies is the smart way to manage AWS access without touching the root account. It keeps things safer by giving just the right permissions where needed. Terraform handles the setup and key generation easily, but remember to keep your state file secure since it stores secrets in plain text. Using a remote, encrypted backend for your state is a good idea. This approach helps you keep your AWS credentials organized, secure, and easy to manage as your project grows.