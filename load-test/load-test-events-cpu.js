import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Environment variables for configuration
const CPU_MODE = __ENV.CPU_MODE || 'LOW';  // LOW or HIGH
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3003';
const DURATION = __ENV.DURATION || '5m';

// CPU mode configurations - Optimized for local demo
const CPU_PROFILES = {
  LOW: {
    startRate: 5,
    preAllocatedVUs: 20,
    maxVUs: 100,
    stages: [
      { target: 10, duration: '1m' },    // Ramp to 10 RPS
      { target: 20, duration: '3m' },    // Hold at 20 RPS
      { target: 0, duration: '1m' },     // Ramp down
    ],
    thresholds: {
      'http_req_duration': ['p(95)<1000', 'p(99)<2000'],  // 95% < 1s, 99% < 2s
      'http_req_failed': ['rate<0.05'],                    // < 5% errors
    },
  },
  HIGH: {
    startRate: 10,
    preAllocatedVUs: 50,
    maxVUs: 300,
    stages: [
      { target: 30, duration: '1m' },    // Ramp to 30 RPS
      { target: 50, duration: '3m' },    // Hold at 50 RPS
      { target: 0, duration: '1m' },     // Ramp down
    ],
    thresholds: {
      'http_req_duration': ['p(95)<2000', 'p(99)<3000'],  // 95% < 2s, 99% < 3s
      'http_req_failed': ['rate<0.1'],                     // < 10% errors
    },
  },
};

const profile = CPU_PROFILES[CPU_MODE.toUpperCase()] || CPU_PROFILES.LOW;

export const options = {
  discardResponseBodies: true,
  scenarios: {
    get_events: {
      executor: 'ramping-arrival-rate',
      startRate: profile.startRate,
      timeUnit: '1s',
      preAllocatedVUs: profile.preAllocatedVUs,
      maxVUs: profile.maxVUs,
      stages: profile.stages,
    },
  },
  thresholds: {
    ...profile.thresholds,
    'http_req_duration{expected_response:true}': profile.thresholds['http_req_duration'],
  },
  // Enhanced reporting
  summaryTrendStats: ['min', 'avg', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)'],
  summaryTimeUnit: 'ms',
};

const PATH = '/api/events';
const HEADERS = {
  'Content-Type': 'application/json',
  // Add authentication if needed:
  // 'Authorization': 'Bearer <token>',
};

export default function () {
  const res = http.get(`${BASE_URL}${PATH}`, {
    headers: HEADERS,
    tags: { name: 'GetEvents' },
  });

  const success = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response time < 5s': (r) => r.timings.duration < 5000,
  });

  if (!success) {
    console.error(`Request failed: status=${res.status}, duration=${res.timings.duration}ms`);
  }

  // Realistic think time between requests
  sleep(0.1);
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const failedRequests = data.metrics.http_req_failed?.values?.passes || 0;
  const totalTime = data.state.testRunDurationMs / 1000;
  const avgRPS = totalRequests / totalTime;

  // Custom summary
  console.log('\n' + '='.repeat(60));
  console.log(`  LOAD TEST SUMMARY - ${CPU_MODE.toUpperCase()} CPU MODE`);
  console.log('='.repeat(60));
  console.log(`  Test Duration    : ${totalTime.toFixed(2)}s`);
  console.log(`  Total Requests   : ${totalRequests}`);
  console.log(`  Failed Requests  : ${failedRequests} (${((failedRequests/totalRequests)*100).toFixed(2)}%)`);
  console.log(`  Avg RPS          : ${avgRPS.toFixed(2)}`);
  console.log(`  VUs Used (peak)  : ${data.metrics.vus_max?.values?.max || 0}`);

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

  console.log('='.repeat(60) + '\n');

  // Generate reports
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.html': htmlReport(data),
  };
}
