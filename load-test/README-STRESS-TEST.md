# 3-Hour Stress Test - Event Service

Long-running stress test to evaluate system stability, memory leaks, and performance degradation over time.

## Overview

- **Duration**: 3 hours (180 minutes)
- **Max Concurrent Users**: 100 VUs
- **Pattern**: Simulates realistic daily traffic with peak hours
- **Total Expected Requests**: ~15,000-20,000 requests

## Test Pattern

```
VUs
100 |         ┌────────┐
    |        /          \            ┌─────┐
 80 |       /            \          /       \
    |      /              \        /         \
 50 |  ┌──┘                └──────┘           \
    | /                                        \
 20 |/                                          \
  0 └───────────────────────────────────────────┘
    0   30  60  90  120  150  180  210  240  270
                    Minutes
```

### Stages Breakdown

| Phase | Duration | Users | Purpose |
|-------|----------|-------|---------|
| **Warm-up** | 15 min | 0→50 | Gradual system warm-up |
| **Normal Load** | 30 min | 50 | Baseline performance |
| **Morning Peak** | 45 min | 50→100 | First peak load |
| **Cool Down** | 15 min | 100→50 | Return to normal |
| **Steady State** | 45 min | 50 | Extended stability test |
| **Afternoon Peak** | 30 min | 50→80 | Second peak load |
| **Wind Down** | 15 min | 80→0 | Graceful shutdown |

## Quick Start

### Basic Run
```bash
k6 run load-test/stress-test-3hrs.js
```

### Custom Base URL
```bash
BASE_URL=http://your-server.com:3003 k6 run load-test/stress-test-3hrs.js
```

### Adjust Max Users
```bash
MAX_VUS=150 k6 run load-test/stress-test-3hrs.js
```

## Running in Background

For 3-hour tests, it's recommended to run in the background:

### Using nohup (Linux/macOS)
```bash
nohup k6 run load-test/stress-test-3hrs.js > stress-test.log 2>&1 &
```

### Using screen (Linux/macOS)
```bash
screen -S stress-test
k6 run load-test/stress-test-3hrs.js
# Press Ctrl+A then D to detach
# Reattach with: screen -r stress-test
```

### Using tmux (Linux/macOS)
```bash
tmux new -s stress-test
k6 run load-test/stress-test-3hrs.js
# Press Ctrl+B then D to detach
# Reattach with: tmux attach -t stress-test
```

## What to Monitor

### During the Test

**1. System Resources:**
```bash
# Monitor Docker container stats
docker stats birdie-event-service

# Monitor logs
docker logs -f birdie-event-service
```

**2. Database Performance:**
```bash
# MongoDB stats
docker exec birdie-mongodb mongosh --eval "db.stats()"
```

**3. Memory Usage:**
Watch for memory leaks - memory should stabilize, not continuously grow.

**4. Response Times:**
Should remain consistent throughout the 3 hours, not degrade over time.

## Expected Results

### Healthy System
- ✅ Response times remain stable
- ✅ Error rate stays below 5%
- ✅ Memory usage stabilizes (no leaks)
- ✅ CPU usage follows load pattern
- ✅ No crashes or restarts

### Warning Signs
- ⚠️ Response times increasing over time
- ⚠️ Memory continuously growing
- ⚠️ Error rate increasing
- ⚠️ Connection timeouts
- ⚠️ Database connection pool exhaustion

## Output Files

After completion, you'll get:
- **Console output**: Detailed metrics summary
- **stress-test-3hrs-summary.html**: Visual HTML report

```bash
# View the report
open stress-test-3hrs-summary.html
```

## Thresholds

| Metric | Threshold | Description |
|--------|-----------|-------------|
| P95 Response Time | < 3000ms | 95% of requests under 3s |
| P99 Response Time | < 5000ms | 99% of requests under 5s |
| Error Rate | < 5% | Less than 5% failed requests |
| Request Rate | > 0 | System continues processing |

## User Behavior Simulation

The test simulates realistic user behavior:
- **Think time**: 3-10 seconds between requests
- **Concurrent users**: Multiple users accessing simultaneously
- **Gradual changes**: Realistic ramp-up/down patterns
- **Peak hours**: Simulates morning and afternoon traffic spikes

## Estimation Calculator

**Expected metrics for 100 users:**
- Think time: ~6s average
- Requests per user per minute: ~10
- Total RPS at 100 users: ~16-17 RPS
- Total requests over 3 hours: ~15,000-20,000

**Expected metrics for 50 users:**
- Total RPS: ~8-9 RPS
- Total requests: ~7,500-10,000

## Tips for Running

1. **Start with clean state:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **Ensure adequate disk space:**
   - Logs can grow large over 3 hours
   - Database may grow with test data

3. **Monitor throughout:**
   - Set up alerts or check periodically
   - Don't just start and forget

4. **Plan for the time:**
   - 3 hours is a long test
   - Best run overnight or during off-hours
   - Ensure stable network connection

5. **Clean up after:**
   ```bash
   # Clean test data if needed
   docker exec birdie-mongodb mongosh event --eval "db.events.deleteMany({createdAt: {\$gte: new Date('2024-01-01')}})"
   ```

## Troubleshooting

**Test stops early:**
- Check system resources (disk, memory)
- Review Docker logs for crashes
- Check network stability

**High error rates:**
- System may be overloaded
- Check database connection limits
- Review service logs for errors
- Consider reducing max VUs

**Connection timeouts:**
- Increase timeout in k6 if needed
- Check service health
- Verify network connectivity

## Comparing with Short Tests

3-hour stress tests reveal issues that short tests miss:
- **Memory leaks**: Only visible over time
- **Connection pool issues**: Accumulate gradually
- **Database performance**: Can degrade with data growth
- **Cache effectiveness**: Real-world cache behavior
- **Resource exhaustion**: Slow resource leaks

Run both short CPU comparison tests AND this 3-hour stress test for comprehensive performance analysis.
