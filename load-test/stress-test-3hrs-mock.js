import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Environment variables for configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3003';
const MAX_VUS = __ENV.MAX_VUS || '100';

// 1-MINUTE DEMO - Compressed version of 3-hour test for quick report validation
// Same load pattern, but compressed to 60 seconds
export const options = {
  discardResponseBodies: true,
  scenarios: {
    stress_test_demo: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Warm-up phase (5s)
        { duration: '5s', target: 20 },    // Quickly ramp to 20 users

        // Normal load (5s)
        { duration: '5s', target: 50 },    // Reach 50 users

        // Morning peak (15s)
        { duration: '5s', target: 100 },   // Ramp to peak
        { duration: '10s', target: 100 },  // Hold peak load

        // Cool down (10s)
        { duration: '10s', target: 50 },   // Back to normal

        // Afternoon peak (15s)
        { duration: '5s', target: 80 },    // Second peak
        { duration: '10s', target: 80 },   // Hold second peak

        // Wind down (10s)
        { duration: '5s', target: 30 },    // Decrease
        { duration: '5s', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '2s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],  // 95% < 3s, 99% < 5s
    'http_req_failed': ['rate<0.05'],                    // < 5% errors
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

  // Short sleep for 1-minute demo (0.1-0.5 seconds to generate enough requests)
  sleep(0.1 + Math.random() * 0.4);
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const failedRequests = data.metrics.http_req_failed?.values?.passes || 0;
  const totalTime = data.state.testRunDurationMs / 1000;
  const avgRPS = totalRequests / totalTime;
  const totalHours = (totalTime / 3600).toFixed(2);

  // Custom summary
  console.log('\n' + '='.repeat(70));
  console.log(`  1-MINUTE DEMO STRESS TEST SUMMARY`);
  console.log(`  (Compressed version - validates 3-hour test reporting)`);
  console.log('='.repeat(70));
  console.log(`  Test Duration    : ${totalTime.toFixed(1)} seconds (${(totalTime / 60).toFixed(2)} minutes)`);
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

  // Calculate throughput
  const requestsPerMinute = totalRequests / (totalTime / 60);
  console.log(`\n  Throughput:`);
  console.log(`    Requests/Min  : ${requestsPerMinute.toLocaleString('en-US', {maximumFractionDigits: 1})}`);
  console.log(`    Requests/Sec  : ${avgRPS.toFixed(2)}`);

  console.log('\n  ✅ This 1-minute test validates the reporting format.');
  console.log('  📊 For production testing, use the 3-hour version (stress-test-3hrs.js)');
  console.log('='.repeat(70) + '\n');

  // Generate reports
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'stress-test-1min-demo.html': htmlReport(data),
  };
}
