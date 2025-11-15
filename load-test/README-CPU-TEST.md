# Event Service Load Test - CPU Comparison

Load testing script for comparing LOW vs HIGH CPU scenarios on the event service GET endpoint.

## Features

- **Configurable CPU Modes**: LOW and HIGH presets for different load levels
- **5-minute test duration** by default
- **Enhanced k6 metrics**: Full percentile reporting (P90, P95, P99, P99.9)
- **HTML Report Generation**: Automatic summary.html output
- **Real-time monitoring**: Console output with detailed metrics
- **Configurable via environment variables**

## Quick Start

### Automated Testing (Recommended)

**Run both LOW and HIGH CPU tests automatically:**
```bash
./load-test/run-cpu-test.sh both
```

**Run only LOW CPU test:**
```bash
./load-test/run-cpu-test.sh low
```

**Run only HIGH CPU test:**
```bash
./load-test/run-cpu-test.sh high
```

The script will:
1. ✓ Check dependencies (Docker, k6)
2. ✓ Start services with appropriate CPU limits
3. ✓ Wait for services to be ready
4. ✓ Run the load test
5. ✓ Generate HTML reports
6. ✓ Clean up containers

### Manual Testing

If you prefer to manage services manually:

**Test with LOW CPU load (20 RPS peak):**
```bash
# Start services with LOW CPU limits
docker-compose -f docker-compose.yml -f docker-compose.cpu-low.yml up -d

# Run test
CPU_MODE=LOW k6 run load-test/load-test-events-cpu.js
```

**Test with HIGH CPU load (50 RPS peak):**
```bash
# Start services with HIGH CPU limits
docker-compose -f docker-compose.yml -f docker-compose.cpu-high.yml up -d

# Run test
CPU_MODE=HIGH k6 run load-test/load-test-events-cpu.js
```

## Configuration Options

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `CPU_MODE` | `LOW` | Load profile: `LOW` or `HIGH` |
| `BASE_URL` | `http://localhost:3003` | Target server URL |
| `DURATION` | `5m` | Test duration (currently fixed in stages) |

### Examples

**Custom base URL:**
```bash
BASE_URL=http://localhost:8080 k6 run load-test/load-test-events-cpu.js
```

**High CPU mode with custom URL:**
```bash
CPU_MODE=HIGH BASE_URL=http://production.example.com k6 run load-test/load-test-events-cpu.js
```

## CPU Mode Profiles

### LOW CPU Mode (Local Demo Friendly)
- **Target RPS**: 5 → 10 → 20 → 0
- **VUs**: 20 pre-allocated, max 100
- **Stages**:
  - 1 min: Ramp to 10 RPS
  - 3 min: Hold at 20 RPS
  - 1 min: Ramp down
- **Thresholds**:
  - P95 < 1000ms
  - P99 < 2000ms
  - Error rate < 5%

### HIGH CPU Mode (Local Demo Friendly)
- **Target RPS**: 10 → 30 → 50 → 0
- **VUs**: 50 pre-allocated, max 300
- **Stages**:
  - 1 min: Ramp to 30 RPS
  - 3 min: Hold at 50 RPS
  - 1 min: Ramp down
- **Thresholds**:
  - P95 < 2000ms
  - P99 < 3000ms
  - Error rate < 10%

## Output & Reports

### Console Output
- Real-time test progress
- Detailed summary with:
  - Total requests & RPS
  - Error rate
  - Full response time percentiles
  - Peak VUs used

### HTML Report
Generated automatically as `summary.html` in the current directory.

**View report:**
```bash
open summary.html  # macOS
xdg-open summary.html  # Linux
start summary.html  # Windows
```

## Docker CPU Configurations

### LOW CPU Mode (`docker-compose.cpu-low.yml`)
- **Event Service**: 0.5 CPU cores, 512MB RAM
- **Other Services**: Proportionally limited
- **Use Case**: Baseline performance testing with resource constraints

### HIGH CPU Mode (`docker-compose.cpu-high.yml`)
- **Event Service**: 4.0 CPU cores, 4GB RAM
- **Other Services**: Proportionally increased
- **Use Case**: Stress testing with ample resources

### Verify CPU Limits
```bash
# Check event-service CPU configuration
docker inspect birdie-event-service --format='{{.HostConfig.NanoCpus}}'

# Monitor real-time CPU usage
docker stats birdie-event-service
```

## Comparison Workflow

### Automated (Easiest)
```bash
# Run both tests and generate comparison reports
./load-test/run-cpu-test.sh both

# View results
open cpu-low-summary.html cpu-high-summary.html
```

### Manual
**1. Run LOW CPU test:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.cpu-low.yml up -d
CPU_MODE=LOW k6 run load-test/load-test-events-cpu.js
mv summary.html cpu-low-summary.html
docker-compose down
```

**2. Run HIGH CPU test:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.cpu-high.yml up -d
CPU_MODE=HIGH k6 run load-test/load-test-events-cpu.js
mv summary.html cpu-high-summary.html
docker-compose down
```

**3. Compare reports:**
```bash
open cpu-low-summary.html cpu-high-summary.html
```

## Key Metrics to Compare

| Metric | Description |
|--------|-------------|
| **P95 Response Time** | 95% of requests faster than this |
| **P99 Response Time** | 99% of requests faster than this |
| **Error Rate** | Percentage of failed requests |
| **Avg RPS** | Actual requests per second achieved |
| **Peak VUs** | Maximum virtual users needed |
| **Threshold Violations** | Which thresholds failed |

## Prerequisites

- k6 installed (`brew install k6` or see [k6.io](https://k6.io/docs/getting-started/installation/))
- Event service running on target URL
- `/api/events` endpoint accessible

## Authentication

If your endpoint requires authentication, edit the `HEADERS` object in the script:

```javascript
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_TOKEN_HERE',
  // or
  'x-api-key': 'YOUR_API_KEY',
};
```

## Troubleshooting

**Connection errors:**
- Verify service is running: `curl http://localhost:3003/api/events`
- Check BASE_URL is correct

**High error rates:**
- Service may be overloaded
- Check service logs for errors
- Consider reducing target RPS in profile

**VUs exhausted:**
- Increase `maxVUs` in the profile
- Service response time may be too slow
