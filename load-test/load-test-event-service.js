import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const requestCount = new Counter('requests');

export const options = {
  discardResponseBodies: true,
  scenarios: {
    open_model: {
      executor: 'ramping-arrival-rate',
      startRate: 50,          // เริ่ม 50 RPS
      timeUnit: '1s',
      preAllocatedVUs: 200,   // กัน VU ไว้พอรับโหลด (ปรับตาม latency)
      maxVUs: 3000,           // เพดาน VU สูงพอ (latency สูงต้องใช้ VU เยอะ)
      stages: [
        { target: 200, duration: '30s' },
        { target: 500, duration: '1m' },
        { target: 800, duration: '3m' },
        { target: 0, duration: '30s' },
      ],
    },
  },
  thresholds: {
    'http_req_duration{expected_response:true}': ['p(95)<5000'],
    http_req_failed: ['rate<0.1'], // ปรับตามต้องการ
  },
};

const BASE_URL = 'http://localhost:3003';        // แก้ให้ตรงระบบจริง
const PATH = '/api/events';                          // แก้ path ให้ตรง (เช่น '/health' ไม่ใช่ '/api/health')
const HEADERS = {                                // ใส่ auth ถ้าจำเป็น
  // 'Authorization': 'Bearer <token>',
  // 'x-api-key': '<key>',
};

export default function () {
  const res = http.get(`${BASE_URL}${PATH}`, { headers: HEADERS });

  // ยอมรับ 2xx ทั้งหมดแทนการ fix เฉพาะ 200
  const ok = check(res, { 'status is 2xx': (r) => r.status >= 200 && r.status < 300 });

  errorRate.add(!ok);
  requestCount.add(1);

  sleep(0.1);
}

export function handleSummary(data) {
  const totalRequests = data.metrics.requests.values.count;
  const totalTime = data.state.testRunDurationMs / 1000;
  const tps = totalRequests / totalTime;

  console.log(`\n==== TEST SUMMARY ====`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Test Duration : ${totalTime.toFixed(2)}s`);
  console.log(`TPS (RPS)     : ${tps.toFixed(2)}\n`);

  return { stdout: JSON.stringify(data) };
}
