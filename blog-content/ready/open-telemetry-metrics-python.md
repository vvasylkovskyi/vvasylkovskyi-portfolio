# Measuring machine metrics using OpenTelemetry in Python

Today I have decided to move onto my next challenge and learn the right way of measuring device telemetry data using open source standard - [OpenTelemetry](https://opentelemetry.io/). OpenTelemetry project allows the app to measure traces, metrics and logs in a standardized way.

In this notes, we will discuss about how to measure metrics data in open telemetry and will instrument our python FastAPI app. Let's dive in.

## What are we going to measure

For this project, we are going to measure the CPU utilization, in particular the % of usage.

## CPU Measurement

We are going to measure CPU using `system.cpu.time`. As the name suggests, this metric measures the time that the cpu spent in a specific state.

### Calculating CPU Delta

An important consideration about this metric is that it is cumulative, meaning each datapoint is a total CPU time spent in that state since boot (in seconds). For example:

| Timestamp | `cpu0.user` (s) |
| --------- | --------------- |
| T1        | 120.0           |
| T2        | 120.18          |

in the above example the cpu0 in user state difference between two timestamps is 0.18 seconds.

### CPU States

The CPU have several states, among which we will track the following most important ones for our use case - measuring CPU overhead caused by our apps.

| State  | What it means                                         | Importance                                     |
| ------ | ----------------------------------------------------- | ---------------------------------------------- |
| user   | Time spent running user-space processes (normal apps) | Shows how much CPU your applications are using |
| system | Time spent in kernel (OS) on system calls             | Indicates OS overhead                          |
| idle   | CPU is doing nothing                                  | Helps compute CPU utilization (`100% - idle%`) |
| wait   | Time waiting for I/O (disk, network)                  | High wait means CPU is idle but blocked on I/O |

For most dashboards and monitoring tools the CPU usage is summarized as:

```sh
CPU Utilization (%) = 100 - idle%
```

hence this is what we are going to do using the CPUs above.

## Measuring CPU as delta in the collector

all details here

https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/cumulativetodeltaprocessor

## Adding Open Telemetry python libraries

First step to generating the telemetry data is to install opentelemetry api and sdk as follows:

```sh
pip install opentelemetry-api opentelemetry-sdk
```

Or, if you are using `Poetry` like me, add this to your `pyproject.toml`

```toml
[tool.poetry.dependencies]
opentelemetry-api = "1.36.0"
opentelemetry-sdk = "1.36.0"
opentelemetry-proto = "1.36.0"
protobuf = "6.32.0"
```

## Open Telemtry Agent

### Docker

```yaml
version: '3.8'
services:
  otel-agent:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: otel-agent
    network_mode: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - ./agent-config.yaml:/etc/otel/agent-config.yaml:ro
    command: ['--config', '/etc/otel/agent-config.yaml']
    environment:
      - HOST_PROC=/host/proc
      - HOST_SYS=/host/sys
```

### Agent Config

```yaml
receivers:
  hostmetrics:
    collection_interval: 10s
    scrapers:
      cpu:
      memory:

exporters:
  otlphttp:
    endpoint: 'http://otel-collector:4318'

processors:
  batch:

service:
  pipelines:
    metrics:
      receivers: [hostmetrics]
      processors: [batch]
      exporters: [otlphttp]
```

## Open Telemetry Collector

### Docker

```yaml
version: '3.8'
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: otel-collector
    volumes:
      - ./collector-config.yaml:/etc/otel/config.yaml
    command: ['--config', '/etc/otel/config.yaml']
    ports:
      - '4317:4317' # OTLP gRPC
      - '4318:4318' # OTLP HTTP
```

### Collector Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: '0.0.0.0:4317'
      http:
        endpoint: '0.0.0.0:4318'

processors:
  batch:
    timeout: 5s

exporters:
  otlphttp:
    endpoint: 'http://video-service-web:4000/api'

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

### Example output

| State              |      Value |                Time |
| ------------------ | ---------: | ------------------: |
| used               | 1977.73 MB | 2025-09-08 14:35:18 |
| free               |  178.05 MB | 2025-09-08 14:35:18 |
| buffered           | 1540.36 MB | 2025-09-08 14:35:18 |
| cached             | 2228.42 MB | 2025-09-08 14:35:18 |
| slab_reclaimable   |  595.51 MB | 2025-09-08 14:35:18 |
| slab_unreclaimable |   72.70 MB | 2025-09-08 14:35:18 |

| CPU  | State     | Delta (s) |     % |                Time |
| ---- | --------- | --------: | ----: | ------------------: |
| cpu0 | user      |      0.12 |  1.21 | 2025-09-08 14:35:18 |
| cpu0 | system    |      0.15 |  1.51 | 2025-09-08 14:35:18 |
| cpu0 | idle      |      9.63 | 97.08 | 2025-09-08 14:35:18 |
| cpu0 | interrupt |      0.00 |  0.00 | 2025-09-08 14:35:18 |
| cpu0 | nice      |      0.00 |  0.00 | 2025-09-08 14:35:18 |
| cpu0 | softirq   |      0.02 |  0.20 | 2025-09-08 14:35:18 |
| cpu0 | steal     |      0.00 |  0.00 | 2025-09-08 14:35:18 |
| cpu0 | wait      |      0.00 |  0.00 | 2025-09-08 14:35:18 |
| cpu1 | user      |      0.07 |  0.70 | 2025-09-08 14:35:18 |
| cpu1 | system    |      0.06 |  0.60 | 2025-09-08 14:35:18 |
| cpu1 | idle      |      9.77 | 98.29 | 2025-09-08 14:35:18 |
| cpu1 | interrupt |      0.00 |  0.00 | 2025-09-08 14:35:18 |
| cpu1 | nice      |      0.00 |  0.00 | 2025-09-08 14:35:18 |
| cpu1 | softirq   |      0.04 |  0.40 | 2025-09-08 14:35:18 |
| cpu1 | steal     |      0.00 |  0.00 | 2025-09-08 14:35:18 |
| cpu1 | wait      |      0.00 |  0.00 | 2025-09-08 14:35:18 |

# Considerations, future work

- Granularity vs throughput: too low measurements (second-by-second spikes) may be interesting but overwhelming
- Backpressure & data loss: configure memory_limiter and batch processors in collector
- Ensure that the metrics are not dropped by Otel Agent. Configure `file_storage` so queues persist to disk. By default when queues fill up, metrics are dropped. Ensure we configure `retry_on_failure` and `sending_queue`.
