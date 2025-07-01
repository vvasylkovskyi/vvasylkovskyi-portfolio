# Terraform - AWS Deploy using Github Actions

Running Terraform on GitHub Actions requires adjusting how AWS credentials are handled. Instead of relying on local profiles, you should use environment variables set via GitHub Secrets. This ensures smooth authentication in the CI environment and avoids errors related to missing AWS profiles.

## Set AWS Credentials Git Secrets 

To run terraform on github actions we must remove any `profile` on the credentials, and instead use the environment variables on our CI. On Github actions here is how this can be accomplished: 

```yml
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  AWS_DEFAULT_REGION: us-east-1
```

## Write Github Action YML to run terraform

Now our github action will use AWS credentials as secrets and run `terraform init` and `terraform apply`

```yml
name: CI

on:
  push:
    branches: [main]
    workflow_dispatch:
      inputs:
      version:
        description: 'Deploy Notes'
        required: true

jobs:
  terraform:
    runs-on: ubuntu-latest

    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      AWS_REGION: us-east-1

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve
```

## Conclusion

By configuring AWS credentials as secrets and removing profile dependencies, you can easily run Terraform commands like `init` and `apply` in GitHub Actions. This setup makes your deployments more reliable, secure, and fully automated within your CI pipeline.