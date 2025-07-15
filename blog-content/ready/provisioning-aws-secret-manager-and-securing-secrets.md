# Provision AWS Secret Manager and Store Secrets Securely

In the previous note we moved terraform state to the shared location, so that multiple team members have ability to provision infra using shared state. You can read about it in here: [Saving Terraform State in a Remote Backend on AWS with S3 and DynamoDB](https://www.viktorvasylkovskyi.com/posts/terraform-state-in-s3-dynamodb-backend).

This shared setup is still not complete because the secrets remain on the user machine. So in this note, we will move the secrets from our laptop and store them in AWS secret Manager. 

## Prerequisites

We assume that you already have VPC and a sample EC-2 instance. If not, I recommend setting up based on the following notes: 
- [Deploying EC2 instance on AWS with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-ec2-on-aws-with-terraform)
- [Provision Datadog Observability on Ec-2 with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-datadog-on-ec2-with-terraform)
- [Provision Pagerduty with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-pagerduty-terraform)

The Datadog Observability is a setup example that enables our Ec-2 with observability, which means that ec-2 instance requires access Datadog API key. Since that key will be stored in AWS secrets manager, it is a great use case for us to learn about how to give access to instance to the secret. 

## Creating a Secret in AWS Secret Manager


Now lets add the actual secrets. We need to add secrets only once, and then reference them. This is the process that we will repeat everytime the secret has to be updated. Let's do this from a command line using `aws` cli: 

```bash
aws secretsmanager create-secret \
    --name "<your-service>/<some-path>/credentials" \
    --description "Application credentials" \
    --secret-string '{
        "datadog_api_key": "your-api-key",
        "datadog_app_key": "your-app-key",
        "pagerduty_token": "your-token"
    }'
```


This command actually the actual secret values. For this example we only using Datadog API and Pagerduty API keys for demo. If everything goes well, you should see an output like below: 

```sh
{
    "ARN": "arn:aws:secretsmanager:us-east-1:088656249151:secret:<your-service>/<some-path>/credentials-MhS9Um",
    "Name": "<your-service>/<some-path>/credentials",
    "VersionId": "61c33df3-6e38-4f7f-8b9d-fda8bad3c880"
}
```

That output indicates your newly created secrets container with the secret. 

## Provisioning AWS Secret Manager and using Secrets

Let's start using the secrets in our infrastructure: 

### Retrieving Secret Container

```hcl
# secrets.tf
data "aws_caller_identity" "current" {}

data "aws_secretsmanager_secret" "app_secrets" {
  name = "<your-service>/<some-path>/credentials"
}
```

The code above defines a new secret in AWS Secrets Manager. It doesn't contain the actual secret value, just metadata about the secret. The `name` parameter should match the secret name you created using AWS CLI.

`data "aws_caller_identity" "current" {}` is a special AWS data source that provides information about the AWS account and IAM principal (user or role) currently being used to make API calls. It requires no arguments and returns three key pieces of information:

  - `account_id` - Your AWS account number
  - `arn` - The ARN (Amazon Resource Name) of the IAM user or role
  - `user_id` - The unique identifier of the IAM user or role

### Getting Secret Value

Next, we will define a data source to retrieve the secret value:

```hcl
# secrets.tf

data "aws_secretsmanager_secret_version" "current" {
  secret_id = data.aws_secretsmanager_secret.app_secrets.id
}
```

We are using `id` from the previous data source to find the correct secret. By default it gets the latest version of the secret.

### Processing Secret Value

The secret value is stored as a JSON string in AWS Secrets Manager, so we will retrieve it into local variable in terraform: 


```hcl
# secrets.tf

locals {
  secrets = jsondecode(data.aws_secretsmanager_secret_version.current.secret_string)
}
```

Since the secret is a JSON string, we use `jsondecode` to convert this into Terraform map. And now we can easily access to our secrets in terraform for example by using it like this: 

```tf
local.secrets.pagerduty_token
```

Let's apply the changes here to ensure nothing breaks so far. Run: `terraform apply --auto-approve`

### Update Terraform code to use secrets

We can now update the code to use the secrets, lets update our providers for example: 

```hcl
# main.tf

provider "datadog" {
  api_key = local.secrets.datadog_api_key
  app_key = local.secrets.datadog_app_key
  api_url = var.datadog_api_url
}

provider "pagerduty" {
  token          = local.secrets.pagerduty_token
  service_region = var.pagerduty_service_region
}
```

## Accessing Secrets from EC-2 instance

Accessing secrets from ec-2 instance is a slightly more complex because we need to give our ec-2 instance a permission to access to the secrets at runtime. This is done using IAM roles (Identity and Access Management). We will define an IAM role using Principle of Least Privilege and attach this role to our ec-2 instance. 

### Creating IAM Role

First, we need to create an IAM role that EC2 instances can assume:

```hcl
# iam.tf

resource "aws_iam_role" "secrets_manager_role" {
  name = "secrets_manager_access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}
```

The `assume_role_policy` (also called trust policy) defines *WHO* can use this role. 

  - `Service = "ec2.amazonaws.com"` means only EC2 instances can assume this role
  - `sts:AssumeRole` is the permission required to take on this role
  - `Effect = "Allow"` explicitly permits this action

### IAM Policy Definition

Now, we create a policy that defined *WHAT* the role can do: 

```hcl
# iam.tf

resource "aws_iam_role_policy" "secrets_manager_policy" {
  name = "secrets_manager_policy"
  role = aws_iam_role.secrets_manager_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:*"
        ]
      }
    ]
  })
}
```

  - `secretsmanager:GetSecretValue` - Permission to read secret values
  - `secretsmanager:DescribeSecret` - Permission to view secret metadata
  - `Resource` specifies which secrets can be accessed using an ARN pattern: `arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:*`. This allows access to all secrets in your account in the specified region.

We are following the principle of least priviledge by 

  - only allowing EC2 to assume the role
  - only granting read-only access to secrets
  - Not allowing creation/modification of secrets

### Using IAM with an EC2 instance

To use this IAM role with our ec2 instance, the best practice to follow is: 

  - Create profile that will use the IAM role. 
  - Attach the profile to ec2 instance

#### Create Profile

we can attach it using an instance profile: 

```hcl
# ec2.tf

resource "aws_iam_instance_profile" "secrets_manager_profile" {
  name = "secrets_manager_profile"
  role = aws_iam_role.secrets_manager_role.name
}
```

#### Attach the profile to ec2 instance

Now let's modify the EC-2 instance resource definition to use the iam_instance_profile: 


```hcl
# ec2.tf

resource "aws_instance" "my_app" {
  # ... existing configuration ...

  iam_instance_profile = aws_iam_instance_profile.secrets_manager_profile.name
}
```

And finally, let's make our ec-2 instance use the new secret:

```hcl
# ec2.tf

resource "aws_instance" "my_app" {
  # ... existing configuration ...

  user_data = templatefile("${path.module}/templates/user_data.tpl", {
    datadog_api_key = local.secrets.datadog_api_key
  })

  iam_instance_profile = aws_iam_instance_profile.secrets_manager_profile.name
}
```

and the `user_data.tpl` is as follows: 


```bash
#!/bin/bash
sudo yum update -y || sudo apt-get update -y
sudo yum install -y python3 || sudo apt-get install -y python3
DD_API_KEY=${datadog_api_key} DD_SITE="datadoghq.eu" bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)" &
echo "<html><body><h1>Hello from Terraform EC2!</h1></body></html>" > index.html
nohup python3 -m http.server 80 &
```

### Outputs

Let's just add some outputs to test before approving

```hcl
output "iam_role_arn" {
  description = "ARN of the IAM role for Secrets Manager access"
  value       = aws_iam_role.secrets_manager_role.arn
}

output "iam_role_name" {
  description = "Name of the IAM role for Secrets Manager access"
  value       = aws_iam_role.secrets_manager_role.name
}

output "instance_profile_arn" {
  description = "ARN of the instance profile"
  value       = aws_iam_instance_profile.secrets_manager_profile.arn
}

output "instance_iam_profile" {
  description = "IAM instance profile attached to the EC2 instance"
  value       = aws_instance.portfolio.iam_instance_profile
}
```

Let's run `terraform apply --auto-approve` and see if it worked! Open the app again and validate everything is fine. 


## Conclusion

Now your secrets are no longer sitting on your laptop — they’re stored securely in AWS Secrets Manager and accessed safely by your EC2 instances using IAM roles. This setup keeps your infrastructure cleaner, safer, and easier to manage as your team and stack grow.

From here, you can build on this foundation with things like secret rotation or using secrets in containers. But for now, you’ve made a solid move toward a more secure and scalable setup.