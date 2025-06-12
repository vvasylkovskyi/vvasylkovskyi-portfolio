resource "pagerduty_service" "main" {
  name                    = "Portfolio_App"
  auto_resolve_timeout    = 14400 # If an incident is not acknowledged, it will be automatically resolved after 4 hours (14,400 seconds).
  acknowledgement_timeout = 600   # If an incident is acknowledged but not resolved, it will be re-alerted after 10 minutes (600 seconds), moving to the next step in the escalation policy. 

  escalation_policy = pagerduty_escalation_policy.main.id
}

data "pagerduty_user" "alert_user" {
  email = "vvasylkovskyi@pagerduty.com"
}

resource "pagerduty_escalation_policy" "main" {
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

data "pagerduty_vendor" "datadog" {
  name = "Datadog"
}

resource "pagerduty_service_integration" "datadog_integration" {
  name    = "Datadog"
  service = pagerduty_service.main.id
  vendor  = data.pagerduty_vendor.datadog.id
}

resource "datadog_integration_pagerduty" "pagerduty" {
  depends_on = [pagerduty_service_integration.datadog_integration]
  subdomain  = var.pagerduty_subdomain
}

resource "datadog_integration_pagerduty_service_object" "main" {
  depends_on   = [pagerduty_service_integration.datadog_integration]
  service_name = pagerduty_service.main.name
  service_key  = pagerduty_service_integration.datadog_integration.integration_key
}
