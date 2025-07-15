# Provision Datadog Observability on Ec-2 with Terraform

At this point, you should have provisioned EC-2. If not, check these notes:

- [Deploying EC2 instance on AWS with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-ec2-on-aws-with-terraform)

In this note, we add a simple configuration to our EC-2 instance so that it sends observability monitoring to Datadog .

## Modify EC-2 Instance user_data script to install datadog agent

All you have to do is to add a datadog agent install script. The agent will connect to your datadog dashboards using Datadog API key. So let's go ahead and automate that with terraform. First, declare variable with datadog api key:

```tf
# variables.tf
variable "datadog_api_key" {
  description = "An API key to interact with Datadog"
  type        = string
}
```

You should define this key in `terraform.tfvars`. Note this file is not supposed to be submitted into your version control (git) so make sure to git ignore it.

finally, add an EC-2 with datadog agent script:

```tf
# ec2.tf

resource "aws_instance" "my_app" {

  ... you instance definition ...
  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y || sudo apt-get update -y
              sudo yum install -y python3 || sudo apt-get install -y python3
              DD_API_KEY=${var.datadog_api_key} DD_SITE="datadoghq.eu"  bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)" &
              echo "<html><body><h1>Hello from Terraform EC2!</h1></body></html>" > index.html
              nohup python3 -m http.server 80 &
              EOF

  user_data_replace_on_change = true
}
```

Note, make sure to add `&` in the end of the datadog install script to install it in the background without blocking your server bootstrap.

And that is it! Apply changes with `terraform apply --auto-approve` and wait a few minutes after the instance is started for the script to finish installing.

### Check the Datadog process is working

SSH into your instance and run the following:

```bash
sudo datadog-agent status
sudo systemctl status datadog-agent
sudo tail -n 100 /var/log/datadog/agent.log
```

### Confirm on the Datadog UI

Go to your [Datadog default metrics dashboard](https://app.datadoghq.eu/dash/integration/30/system---metrics) (or the appropriate site for your region) and check:

- Your service shows up as a host.
- Metrics are being collected.
- The host has the correct hostname.

## Conclusion

Here we have installed simple datadog script using our terraform provider on EC-2 and gained some basic observability. In the next steps, we will define some alerts so that our datadog notifies us when metrics go wrong.
