# Provision Pagerduty with Terraform

If you are reading this, then you probably already familiar with deploying your service on cloud solution like AWS EC-2 or a cluster. Most of the time, your code runs well, and the continuous delivery and deployment make it easy to add new code. You probably even have a good tests coverage.

So what is next? When users use your app the last thing you want is for it for some reason not to work. If it doesn't work, your service is disrupted and you will want to fix it. So how will you know that the service is down? Or you app is unavailable? Here enters Pagerduty. Pagerduty is an on-call incident management solution that will alert you via mobile app or an email and let you know that something is not right before your users know. It ultimately gives you the time to fix your bug (or in Pagerduty term: incident).

In this notes, we will walk through how to automate this feature - alerting and incident creation using PagerDuty. The best part - we can use terraform to provide all.

## Get Started with PagerDuty

Before diving into code details, we need some basic information to access PagerDuty APIs. Head over to https://www.pagerduty.com/ and create an account. Once you have created your account, we can start setting up our terraform provider for pagerduty.

We will need an API token: `pagerduty_token`.

- Navigate to your PagerDuty account -> Integrations -> API Access Keys -> Create API API Key

## Add Pagerduty Provider

Let's add `provider` in `main.tf`

```tf
# main.tf

provider "pagerduty" {
  token          = var.pagerduty_token
  service_region = var.pagerduty_service_region
}
```

Define versions for out new provider:

```tf
# versions.tf
terraform {
  required_providers {
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 2.13"
    }
  }
}
```

Also the variables:

```tf
# variables.tf

variable "pagerduty_token" {
  type        = string
  description = "PagerDuty API token"
}

variable "pagerduty_service_region" {
  type        = string
  description = "PagerDuty service region"
  default     = "eu" # Default US region. Supported value: us.
}
```

I am using eu service region because I am based in Europe. My pagerduty URL look like this: `https://<company_name>.eu.pagerduty.com/`. If you don't have `eu` then you may be in `us`.

Run `terraform init` to define this new provider.

## Define PagerDuty main resources

PagerDuty works by assigning incidents to the services. Then, when the incident is created, Users that are on-call will be notified according to the Escalation Policy. An escalation policy in PagerDuty defines how and when alerts are escalated to different users or teams if they are not acknowledged or resolved within a specified time. It answers the question: **“Who gets alerted, and what happens if they don’t respond?”**.

### Create PagerDuty Service

```tf
# pagerduty.tf

resource "pagerduty_service" "main" {
  name                    = "My_App_Service"
  auto_resolve_timeout    = 14400 # If an incident is not acknowledged, it will be automatically resolved after 4 hours (14,400 seconds).
  acknowledgement_timeout = 600   # If an incident is acknowledged but not resolved, it will be re-alerted after 10 minutes (600 seconds), moving to the next step in the escalation policy.

  escalation_policy = pagerduty_escalation_policy.main.id
}
```

**Note:** make sure that the `name` doesn't have spaces. Otherwise the integration will not propagate the messages correctly. Also notice the flags above: `auto_resolve_timeout` and `acknowledgement_timeout`. These help reduce alert fatigue and ensure no alert is ignored indefinitely.

### Reference your user

If you just created an environment in PagerDuty then you most likely already have yourself in the list of users, so we will use `data` to reference our user.

```tf
# pagerduty.tf

data "pagerduty_user" "alert_user" {
  email = "engineer@example.com"
}
```

### Define the escalation policy that routes alerts:

If you are just getting to know PagerDuty and using free plan (perfect for a startup), then you can have maximum of one escalation policy. So we will also reference already existing one using `data`, Alternatively you can delete escalation policy on the UI.

```tf
# pagerduty.tf

data "pagerduty_escalation_policy" "main" {
  name      = "Default Escalation"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 10
    target {
      type = "user_reference"
      id   = data.pagerduty_user.alert_user.id
    }
  }
}
```

You could also provide users in bulk and teams, but since I am using free plan, I am defining only 1 engineer. If you are interested in adding more users using terraform checkout this example of [Gavin Reynolds](https://github.com/gsreynolds) who did a great job defining a more complex example in this [pagerduty_datadog_terraform_examples Github Repository](https://github.com/gsreynolds/pagerduty_datadog_terraform_examples/tree/main).

Let's apply what we have already using `terraform apply --auto-approve` to test our keys and this basic example. Head over to your PagerDuty UI and see new user, service and escalation policy provided.

## Automate incident by adding Datadog Monitor that Alerts PagerDuty

In this section we are going to add an integration between PagerDuty and Datadog and configure Datadog such that it will send alerts to PagerDuty. The PagerDuty will detect alerts and create incidents, notifying the users on call according to escalation policy.

I recommend that you read my previous article about [Provision Datadog Observability on Ec-2 with Terraform](https://www.vvasylkovskyi.com/posts/provisioning-datadog-on-ec2-with-terraform). It will walk you through about how to setup Datadog Agent and ensure that your app has observability. Once the observability is in place, next we will configure rules in datadog about when to create the alert based on observability data.

### Add Datadog Provider

First, we need to get datadog keys and provision datadog in terraform. `datadog_api_key` and `datadog_app_key`

- `datadog_api_key` head to your datadog `https://app.datadoghq.eu/organization-settings/api-keys` -> and create and API key.
- `datadog_app_key` head to your datadog `https://app.datadoghq.eu/personal-settings/application-keys` -> and create an App key.
- `datadog_api_url` is the URL you can find in `https://registry.terraform.io/providers/DataDog/datadog/latest/docs#api_url`. For me it is EU based - `https://api.datadoghq.eu/`

Now, lets add Datadog provider:

```tf
# main.tf

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
  api_url = var.datadog_api_url
}
```

And define versions:

```tf
# versions.tf

terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.0"
    }
  }
}
```

And the variables. Note make sure to have your actual keys in `terraform.tfvars`.

```tf
# variables.tf

variable "datadog_api_key" {
  description = "An API key to interact with Datadog"
  type        = string
}

variable "datadog_app_key" {
  description = "An App key to interact with Datadog"
  type        = string
}

variable "datadog_api_url" {
  description = "Datadog API URL"
  type        = string
}
```

Lets provide first with `terraform init`.

### Create PagerDuty Service Integration in Terraform

We need the PagerDuty + Datadog integration key to connect Datadog to PagerDuty, so lets create an integration for it with terraform:

#### **Adding Datadog Integration on PagerDuty side:**

We will add a Datadog Integration on PagerDuty using official Datadog Vendor:

```tf
# pagerduty.tf

data "pagerduty_vendor" "datadog" {
  name = "Datadog"
}

resource "pagerduty_service_integration" "datadog_integration" {
  name    = "Datadog"
  service = pagerduty_service.main.id
  vendor  = data.pagerduty_vendor.datadog.id
}
```

If you run `terraform apply --auto-approve`, you can find an integration created on UI in PagerDuty. Navigate to `Service Directory -> <Service Name> -> View Integrations`, and find Datadog there.

Note, we are adding the official Datadog vendor and assign it to the integration. This way PagerDuty will recognize this integration as Datadog. Executing this code will create official pagerduty + datadog integration and will output the integration key - `pagerduty_service_integration.datadog_integration.integration_key`. We can add it into outputs for debugging:

```tf
# outputs.tf

output "datadog_integration_key" {
  value = pagerduty_service_integration.datadog_integration.integration_key
}
```

Now that integration key is going to be used on the Datadog side to send alerts to the PagerDuty.

#### **Adding PagerDuty Integration on Datadog side**

Now we have to enable the integration from datadog side. For this we need to define global subdomain and the individual service integration.

**Add Subdomain:**

Let's begin by adding a subdomain in datadog-to-pagerduty integration so that datadog knows to what subdomain to route alerts. The sub-domain is found in the URL of your pagerduty: `https://<subdomain>.<service-region>.pagerduty.com`.

```tf
# pagerduty.tf

resource "datadog_integration_pagerduty" "pagerduty" {
  depends_on = [pagerduty_service_integration.datadog_integration]
  subdomain = var.pagerduty_subdomain
}
```

**Add Service Integration:**

And finally, we can create a service integration from Datadog to Pagerduty service:

```tf
# pagerduty.tf


resource "datadog_integration_pagerduty_service_object" "main" {
  depends_on   = [pagerduty_service_integration.datadog_integration]
  service_name = pagerduty_service.main.name
  service_key  = pagerduty_service_integration.datadog_integration.integration_key
}
```

This should make integrations work. Now we can test using `terraform apply --auto-approve` and validate on Datadog UI in Integrations section that there is a new PagerDuty integration with our service

### Create a Datadog Monitor that Alerts PagerDuty

Let's go ahead and define Alert in Datadog using terraform. We will define a simple CPU alerting which will alert when CPU usage is above 80% on the host machine.

**High CPU Alert:**

```tf
# datadog.tf

resource "datadog_monitor" "cpu_high" {
  name  = "High CPU Usage"
  type  = "metric alert"
  query = "avg(last_5m):avg:system.cpu.user{*} > 0.2"

  message = <<-EOT
    CPU usage is above 80% on host {{host.name}}.

    @pagerduty-${pagerduty_service.main.name}
  EOT

  notify_no_data    = false
  renotify_interval = 60
  priority          = 1
  tags              = ["severity:P1"]
}

```

The key part is the message including which routes the alert to PagerDuty.

```js
@pagerduty-${pagerduty_service.main.name}
```

**Host Service Check:**

Also, another alerting we can add is to measure whether the host is still online. We can test it by verifying whether datadog agent is sending metrics. If it is not sending them for 5 minutes then it means that the device is offline.

```tf
# datadog.tf

resource "datadog_monitor" "host_down" {
  name = "Host is Offline"
  type = "service check"

  query = "\"datadog.agent.up\".over(\"*\").by(\"host\").last(2).count_by_status()"

  message = <<-EOT
    Host {{host.name}} is not reporting. Possible downtime.

    @pagerduty-${pagerduty_service.main.name}
  EOT

  evaluation_delay = 60
  no_data_timeframe = 2
  notify_no_data   = true
  tags             = ["severity:P1"]
}

```

## Testing

The easiest way to test this setup is to shutdown the host (our ec-2 instance) and wait 1 minutes for the alert to be created and incident to propagate. Let's send a shutdown signal to the instance:

```sh
ssh <your-username>@<your-ip> 'sudo shutdown -h now'
```

Wait for 2 minutes (note our `no_data_timeframe = 2`) and see the alert being triggered in Datadog UI. You should get the alert in pagerduty and an Incident + an email sent to you saying there is an incident.

## Conclusion

And that’s it! With just a bit of Terraform, you’ve now got a full PagerDuty setup that automatically alerts you when something goes wrong—and even hooks into Datadog to trigger incidents based on real metrics. No more waiting for users to tell you your app is down. Now, you’re ready to catch issues early and fix them fast. Happy automating!
