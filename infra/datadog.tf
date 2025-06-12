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

resource "datadog_monitor" "host_down" {
  name = "Host is Offline"
  type = "service check"

  query = "\"datadog.agent.up\".over(\"*\").by(\"host\").last(2).count_by_status()"

  message = <<-EOT
    Host {{host.name}} is not reporting. Possible downtime.

    @pagerduty-${pagerduty_service.main.name}
  EOT

  evaluation_delay  = 60
  notify_no_data    = true
  no_data_timeframe = 2
  tags              = ["severity:P1"]
}

