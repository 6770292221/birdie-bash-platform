import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Environment variables for configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3003';
const MAX_VUS = __ENV.MAX_VUS || '100';

// 3-hour stress test configuration
// Simulates realistic user behavior over an extended period
export const options = {
  discardResponseBodies: true,
  scenarios: {
    stress_test_3hrs: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Warm-up phase (15 min)
        { duration: '5m', target: 20 },    // Gradually increase to 20 users
        { duration: '10m', target: 50 },   // Reach 50 concurrent users

        // Normal load phase (30 min)
        { duration: '30m', target: 50 },   // Sustain 50 users

        // Peak hours - morning (45 min)
        { duration: '15m', target: 100 },  // Ramp up to peak
        { duration: '30m', target: 100 },  // Sustain peak load

        // Cool down to normal (15 min)
        { duration: '15m', target: 50 },   // Back to normal

        // Steady state (45 min)
        { duration: '45m', target: 50 },   // Maintain normal load

        // Second peak - afternoon (30 min)
        { duration: '10m', target: 80 },   // Second peak
        { duration: '20m', target: 80 },   // Sustain second peak

        // Wind down (15 min)
        { duration: '10m', target: 30 },   // Decrease load
        { duration: '5m', target: 0 },     // Ramp down to 0
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],  // 95% < 3s, 99% < 5s
    'http_req_failed': ['rate<0.05'],                    // < 5% errors over 3 hours
    'http_reqs': ['rate>0'],                             // Ensure requests are being made
  },
  summaryTrendStats: ['min', 'avg', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)'],
  summaryTimeUnit: 'ms',
};

const PATH = '/api/events';
const HEADERS = {
  'Content-Type': 'application/json',
};

export default function () {
  const res = http.get(`${BASE_URL}${PATH}`, {
    headers: HEADERS,
    tags: { name: 'GetEvents' },
  });

  const success = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response time < 10s': (r) => r.timings.duration < 10000,
  });

  if (!success && Math.random() < 0.01) { // Log 1% of failures to avoid spam
    console.error(`Request failed: status=${res.status}, duration=${res.timings.duration}ms`);
  }

  // Realistic user think time: 3-10 seconds between requests
  sleep(3 + Math.random() * 7);
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const failedRequests = data.metrics.http_req_failed?.values?.passes || 0;
  const totalTime = data.state.testRunDurationMs / 1000;
  const avgRPS = totalRequests / totalTime;
  const totalHours = (totalTime / 3600).toFixed(2);

  // Custom summary
  console.log('\n' + '='.repeat(70));
  console.log(`  3-HOUR STRESS TEST SUMMARY`);
  console.log('='.repeat(70));
  console.log(`  Test Duration    : ${totalHours} hours (${(totalTime / 60).toFixed(1)} minutes)`);
  console.log(`  Total Requests   : ${totalRequests.toLocaleString()}`);
  console.log(`  Failed Requests  : ${failedRequests} (${((failedRequests/totalRequests)*100).toFixed(3)}%)`);
  console.log(`  Avg RPS          : ${avgRPS.toFixed(2)}`);
  console.log(`  Peak VUs         : ${data.metrics.vus_max?.values?.max || 0}`);

  if (data.metrics.http_req_duration) {
    const duration = data.metrics.http_req_duration.values;
    console.log(`\n  Response Times:`);
    console.log(`    Min     : ${duration.min?.toFixed(2)}ms`);
    console.log(`    Avg     : ${duration.avg?.toFixed(2)}ms`);
    console.log(`    Median  : ${duration.med?.toFixed(2)}ms`);
    console.log(`    Max     : ${duration.max?.toFixed(2)}ms`);
    console.log(`    P(90)   : ${duration['p(90)']?.toFixed(2)}ms`);
    console.log(`    P(95)   : ${duration['p(95)']?.toFixed(2)}ms`);
    console.log(`    P(99)   : ${duration['p(99)']?.toFixed(2)}ms`);
    console.log(`    P(99.9) : ${duration['p(99.9)']?.toFixed(2)}ms`);
  }

  // Calculate requests per hour
  const requestsPerHour = totalRequests / parseFloat(totalHours);
  console.log(`\n  Throughput:`);
  console.log(`    Requests/Hour : ${requestsPerHour.toLocaleString('en-US', {maximumFractionDigits: 0})}`);
  console.log(`    Requests/Min  : ${(requestsPerHour / 60).toLocaleString('en-US', {maximumFractionDigits: 1})}`);

  console.log('='.repeat(70) + '\n');

  // Generate reports
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'stress-test-3hrs-summary.html': htmlReport(data),
  };
}
