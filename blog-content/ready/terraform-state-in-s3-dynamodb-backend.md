# Saving Terraform State in Remote Backend on AWS with S3 and DynamoDB

I have been writing quite a bit of infrastructure as code with terraform now and noticed an interesting property of terraform. Whenever I run `terraform apply` the changes are propagated to the cloud (AWS in my case), but when I switch my laptop, and pull my code, I cannot perform `terraform apply` on the other machine because the state is not in sync.

You may have noticed that everytime a change is applied, terraform updates the `terraform.tfstate` JSON file which is a file that contains current cloud state. This file is local, so to trully start collaborating with the team (or like in my case, work on two laptops), we need to move the terraform state into a shared location. So the key to solving our problem is now reduced to finding an optimal way of sharing terraform state.

## Pre-requisites

Note this article assumes that you already have a VPC provided with terraform and AWS setup. Adding remote state requires to store it remotely in a VPC, so if you haven't done so yet, I recommend reading this article to set it up: [Deploying EC2 instance on AWS with Terraform](https://www.vvasylkovskyi.com/posts/provisioning-ec2-on-aws-with-terraform).

## Adding Terraform State into remote location in AWS - how it works

The industry seems to have converged on the practicce of storing terraform state in DynamoDB and S3. Now at first I was confused about why do we need both DynamoDB and S3? In practice, terraform state is stored in S3, and DynamoDB is used only for state locking. Terraform manages infrastructure as a single state file. If two people (or processes, like CI pipelines) run terraform apply at the same time, it can corrupt the state. To avoid this, Terraform uses a lock — it marks the state as "in use" before making changes and releases it afterward. Terraform needs a shared, highly available, and atomic locking mechanism that works across machines/users - which DynamoDB happens to provide. There is an even better explanation in [official terraform docs](https://developer.hashicorp.com/terraform/language/state/backends).

## Adding Terraform backend

Alright, so we know that we need both S3 and DynamoDB to enable remote state in terraform. Now, if we provision those with terraform, terraform will not know that it is supposed to use them for locking and storing state - they would be just resources waiting to be used. Here enters [terraform backend](https://developer.hashicorp.com/terraform/language/backend#available-backends).

Backend is an instruction that tells terraform where to store the state.

## Adding Terraform Backend with code

Terraform backend assumes the dynamoDB and S3 already exist. So we need to make apply in two phases: first provision S3 and DynamoDB, and then provision terraform backend that will use S3 and DynamoDB. Let's begin:

### Provisioning S3 and DynamoDB

Lets create a `backend.tf` where we will store all the related code. Let's begin by adding S3 bucket.

```tf
# backend.tf
resource "aws_s3_bucket" "terraform_state" {
    bucket = "example-name-terraform-state-backend"

    lifecycle {
      prevent_destroy = true
    }
}
```

Note that the AWS S3 have global names, so the `bucket = example-name-terraform-state-backend` has to be unique per all the AWS. I am also adding `prevent_destroy=true` so that we don't accidentally destroy our state resources.

Now, let's add DynamoDB:

```tf
# backend.tf

resource "aws_dynamodb_table" "terraform-lock" {
    name           = "terraform_state"
    hash_key       = "LockID"
    billing_mode   = "PAY_PER_REQUEST"

    attribute {
        name = "LockID"
        type = "S"
    }
}
```

The DynamoDB name doesn't have to be unique so you are free to name it to your liking. The primary key to be used to lock the state in dynamoDB must be called `LockID` and must be a “string” type (S). Note we are specifying `billing_mode = "PAY_PER_REQUEST"` - this activates AWS Free Tier and allows up to 200M requests/month.

We can also add some outputs for debugging and to inspect manually on AWS console UI:

```tf
# backend.tf

output "dynamodb_table_url" {
  value       = "https://console.aws.amazon.com/dynamodb/home?region=${var.aws_region}#tables:selected=${aws_dynamodb_table.terraform-lock.name};tab=overview"
  description = "Console URL for the DynamoDB table used for Terraform state locking."
}

output "s3_bucket_url" {
  value       = "https://s3.console.aws.amazon.com/s3/buckets/${aws_s3_bucket.terraform-state.id}?region=${var.aws_region}&tab=objects"
  description = "Console URL for the S3 bucket storing Terraform state."
}

```

Now we have both resources, let's apply and provision them: run `terraform apply --auto-approve`. After the state is applied you should see your outputs in the console:

```sh
Apply complete! Resources: 2 added, 2 changed, 1 destroyed.

Outputs:

dynamodb_table_url =
s3_bucket_url =
```

### Provisioning terraform backend

Now that we have the resources used for backend, we can begin instructing terraform to use them to store the state file. Let's define that:

```tf
# backend.tf

terraform {
  backend "s3" {
    bucket         = "vvasylkovskyi-portfolio-terraform-state-backend"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform_state"
  }
}
```

We need to initialize backend with `terraform init` first. We get the message:

```sh
Initializing the backend...
Do you want to copy existing state to the new backend?
  Pre-existing state was found while migrating the previous "local" backend to the
  newly configured "s3" backend. No existing state was found in the newly
  configured "s3" backend. Do you want to copy this state to the new "s3"
  backend? Enter "yes" to copy and "no" to start with an empty state.
```

Type `yes` and continue. We should see something like follows:

```sh
Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

So all is good. And now, finally lets do the `terraform apply --auto-approve`. Note that now we can see the new message prior to applying changes:

```sh
terraform apply --auto-approve
Acquiring state lock. This may take a few moments...
```

Which is a good indication that our lock is working correctly. Also, you may notice that `terraform.tfstate` is now empty, which means that the terraform state has been migrated into remote location - our s3. You can check the outputs and see that now you have a new object in AWS S3.

# Conclusion

And that is a wrap! We now have a terraform state remote - a step closer to collaborate. Hope you found this note insightful. Happy coding!
