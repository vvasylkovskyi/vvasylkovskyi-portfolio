# Provisioning S3 with Terraform

In this notes we will write the code for the `s3` bucket, and modify the `iam` role to reference the module. 

## Previous notes

This notes is a follow up on previous secure AWS Access - [Provisioning IAM with Terraform for secure AWS access](https://www.vvasylkovskyi.com/posts/provisioning-iam-with-terraform). Please read it to get familiar with the best practices on how to interact with AWS via terraform. 

Also, a useful notes in case you are new to the terraform modules - [Provisioning EC-2 Instance on Terraform using Modules and best practices](https://www.vvasylkovskyi.com/posts/terraform-modularizing).

## Code on Github

Full code available on [`https://github.com/vvasylkovskyi/vvasylkovskyi-infra/tree/vv-s3-bucket-v4`](https://github.com/vvasylkovskyi/vvasylkovskyi-infra/tree/vv-s3-bucket-v4). You can clone that and apply the infra yourself, all you need to do is to modify the variables for your domain.

## S3 bucket module 

Let's write terraform to provision `s3`


```hcl
# modules/s3/main.tf
resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls   = true
  block_public_policy = true
  ignore_public_acls  = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    id     = "delete-old-objects"
    status = "Enabled"

    filter {}

    expiration {
      days = 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

This is all the code we are going to need. Here is the breakdown: 

  - `aws_s3_bucket` - creates the bucket itself
  - `aws_s3_bucket_public_access_block` - here we ensure that the bucket doesn't allow public access
  - `aws_s3_bucket_server_side_encryption_configuration` - encrypted bucket
  - `aws_s3_bucket_versioning` - we have enabled versioning
  - `aws_s3_bucket_lifecycle_configuration` - lifecycle rule to automatically delete (or transition) old objects, best if you want to be cost-efficient. 

### Inputs

to use it as a module, we will simply provide the bucket name: 

```hcl
module "app_bucket" {
  source      = "./modules/s3_bucket"
  bucket_name = "my-app-bucket-name"
}
```

hence the `variables.tf` should be: 

```hcl
variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket"
}
```

### Connecting to our IAM policy

This module can be used directly in the IAM policy - to auto the access control provisioning to the right s3. For that we need to output the `s3` ARN and name and then grab them in IAM policy. 

Remember our IAM policy from [Provisioning IAM with Terraform for secure AWS access](https://www.vvasylkovskyi.com/posts/provisioning-iam-with-terraform): 

```hcl
resource "aws_iam_policy" "s3_upload_policy" {
  name        = "my_app_s3_upload_policy"
  description = "Allow put/get/list objects in specific bucket"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ],
        Resource = [
          module.app_bucket.bucket_arn,
          "${module.app_bucket.bucket_arn}/*"
        ]
      }
    ]
  })
}
```

## Apply and run 

Test using `terraform init` and `terraform apply --auto-approve`. Now you should have the `s3` to interact with! 

## Conclusion

That's it — we've successfully provisioned an `S3` bucket using Terraform, wrapped it into a reusable module, and connected it to our IAM setup for secure and automated access control. This approach keeps your infrastructure clean, modular, and easy to maintain. As always, treat Terraform like code: review, version, and test it before promoting to production. In the next notes, we’ll likely expand on this foundation—maybe exploring CloudFront or integrating S3 with other AWS services. Stay tuned!