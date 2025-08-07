# Saving Terraform State in a Remote Backend on AWS with S3 and DynamoDB

I've been writing quite a bit of infrastructure as code using Terraform recently, and I've noticed an important behavior. Whenever I run terraform apply, the changes are applied to the cloud (AWS, in my case). However, if I switch to a different laptop and pull the code repository, I can't run terraform apply there—the Terraform state isn't synchronized across machines.

As you may have noticed, each time Terraform applies changes, it updates the terraform.`tfstate` file, which contains a JSON representation of the current infrastructure state. By default, this file is stored locally. To collaborate effectively with teammates—or, as in my case, to work across multiple laptops—we need to store the Terraform state in a shared location. In other words, the key to solving our problem is to find a reliable way to share Terraform state.

## Pre-requisites

This article assumes that you already have a VPC provisioned using Terraform and that your AWS environment is properly configured. Since remote state storage requires provisioning resources within AWS, I recommend reading this article to set that up first: [Deploying EC2 instance on AWS with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-ec2-on-aws-with-terraform).

## How Remote State in AWS Works

The industry standard for storing remote Terraform state on AWS is to use a combination of S3 and DynamoDB. At first, I wondered: why both? In practice, S3 stores the actual state file, while DynamoDB is used for state locking.

Terraform maintains infrastructure as a single state file. If two people (or automated pipelines) run terraform apply at the same time, it can result in a corrupted state. To avoid this, Terraform implements locking—it marks the state as "in use" during updates and releases the lock afterward. It requires a shared, highly available, atomic locking mechanism, which DynamoDB provides.

There's an excellent explanation of this concept in the [official terraform docs](https://developer.hashicorp.com/terraform/language/state/backends).

## Introducing the Terraform Backend

With S3 and DynamoDB identified as our storage and locking mechanisms, we need to configure Terraform to use them explicitly. This is where [terraform backends](https://developer.hashicorp.com/terraform/language/backend#available-backends) come in. A backend in Terraform defines where and how state is loaded and how an operation such as `apply` is executed.

Backend is an instruction that tells terraform where to store the state.

## Writing the Terraform Backend Configuration

Terraform expects that the backend resources (S3 and DynamoDB) already exist before it can use them. This means we'll perform our setup in two phases:

1. Provision the S3 bucket and DynamoDB table.
2. Configure and initialize the backend.

Let's walk through both steps.

### Step 1: Provisioning S3 and DynamoDB

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

### Step 2: Configuring the Terraform Backend

Now that we have the resources used for backend, we can begin instructing terraform to use them to store the state file. Let's define that:

```tf
# backend.tf

terraform {
  backend "s3" {
    bucket         = "viktorvasylkovskyi-portfolio-terraform-state-backend"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform_state"
    profile        = "<your-aws-credentials-profile>"
  }
}
```

Note, we are using `profile` in this backend. This is important to prevent an error occuring during backend initialization (S3 backend), before the `provider` block is applied. Provider block usually initialized `aws` with credentials at `profile`, but if backend is initialized first, then there will be no credentials. To avoid this race condition, and so your provider config does NOT affect backend auth, we are adding profile to the backend as well. Let's initialize backend with `terraform init` first. We get the message:

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

## Force Unlocking and skip lock

Although not recommended, sometimes the lock may get locked forever in which case we either have to unlock it forcefully or skip lock and apply terraform changes regardless. Here we will explain how to do that: 

### Unlock DynamoDB lock

When getting an error of a sort

```sh
Acquiring state lock. This may take a few moments...
╷
│ Error: Error acquiring the state lock
│ 
│ Error message: operation error DynamoDB: PutItem, https response error StatusCode: 400, RequestID:
│ 8CN0614VBTID09CR9GNKFQNUGJVV4KQNSO5AEMVJF66Q9ASUAAJG, ConditionalCheckFailedException: The conditional
│ request failed
│ Lock Info:
│   ID:        <lock-id>
│   Path:      <your-path>/terraform.tfstate
│   Operation: OperationTypeApply
│   Who:       you@your-user
│   Version:   1.6.4
│   Created:   2025-06-20 14:30:45.664356 +0000 UTC
│   Info:      
```

You can extract the `ID` of the lock above and forcefully unlock: 

```sh
terraform force-unlock <lock-id>
```

### Skip lock

Alternatively, you may apply with locking: 


```sh
terraform apply --auto-approve -lock=false
```

# Conclusion

And that’s a wrap! With Terraform state now stored remotely in AWS S3 and locked via DynamoDB, you’re one step closer to effective collaboration across machines and teams. Hope you found this guide helpful. The continuation choice of what to do it endless. A common requirement of many applications is to retrieve secrets for the machines securely, and our Ec-2 machine is no different. Naturally, next step is to learn how to [Provision AWS Secret Manager and Store Secrets Securely](provisioning-aws-secret-manager-and-securing-secretshttps://www.viktorvasylkovskyi.com/posts/). Happy learning!
