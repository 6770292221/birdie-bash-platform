# Load Testing & Scaling Guide

คู่มือการทดสอบ Load และ Scale Event Service ด้วย k6

---

## ขั้นตอนการทดสอบ

### 1. เตรียมสภาพแวดล้อม

```bash
# Stop containers ทั้งหมด
docker-compose down

# Start services ด้วย 1 instance
docker-compose up -d

# ตรวจสอบ event-service instances
docker ps --filter "name=event-service"
```

**ผลลัพธ์:**
```
NAMES                                  STATUS
birdie-bash-platform-event-service-1   Up X seconds
```

---

### 2. ติดตั้ง k6 (ถ้ายังไม่มี)

```bash
# macOS
brew install k6

# ตรวจสอบ version
k6 version
```

**ผลลัพธ์:**
```
k6 v0.54.0 (go1.23.1, darwin/arm64)
```

---

### 3. รัน Load Test กับ 1 Instance

```bash
k6 run load-test\load-test-event-service.js | tee load-test-1-instance.log
```

**ผลลัพธ์ที่ได้:**
- Average Response Time: **1.88 ms**
- P95 Response Time: **3.95 ms**
- Max Response Time: **11.8 ms**
- Total Requests: **6,292 requests**
- Max Virtual Users: **50**

---

### 4. Scale เป็น 3 Instances

```bash
# Scale event-service
docker-compose up -d --scale event-service=3

# ตรวจสอบ instances
docker ps --filter "name=event-service"
```

**ผลลัพธ์:**
```
NAMES                                  STATUS
birdie-bash-platform-event-service-3   Up X seconds
birdie-bash-platform-event-service-2   Up X seconds
birdie-bash-platform-event-service-1   Up X minutes
```

---

### 5. รัน Load Test กับ 3 Instances

```bash
k6 run load-test-event-service.js | tee load-test-3-instances.log
```

**ผลลัพธ์ที่ได้:**
- Average Response Time: **1.76 ms** ✅ ดีขึ้น 6.4%
- P95 Response Time: **3.73 ms** ✅ ดีขึ้น 5.6%
- Max Response Time: **13.5 ms**
- Total Requests: **6,292 requests**
- Max Virtual Users: **50**

---

## สรุปการเปรียบเทียบ

| Metric | 1 Instance | 3 Instances | ผลต่าง |
|--------|-----------|-------------|--------|
| Avg Response | 1.88 ms | 1.76 ms | -6.4% ✅ |
| P95 Response | 3.95 ms | 3.73 ms | -5.6% ✅ |
| Total Requests | 6,292 | 6,292 | เท่าเดิม |
| Throughput | ~52 req/s | ~52 req/s | เท่าเดิม |

---

## ข้อดีของการ Scale

1. **Load Balancing** - กระจาย HTTP requests ไปยัง 3 instances
2. **RabbitMQ Processing** - ประมวลผล messages เร็วขึ้น (shared queue)
3. **High Availability** - ถ้า 1 instance ล้ม ยังมี 2 instances รับงานต่อ
4. **Better Performance** - Response time ดีขึ้นเฉลี่ย 5-6%

---

## การปรับแต่ง Load Test

แก้ไข `load-test-event-service.js`:

```javascript
// เพิ่ม load สูงขึ้นเพื่อเห็นความแตกต่างชัดเจน
export const options = {
  stages: [
    { duration: '30s', target: 100 },  // 100 VUs
    { duration: '1m', target: 200 },   // 200 VUs
    { duration: '30s', target: 0 },
  ],
};
```

---

## Architecture Notes

**Event Service Configuration:**
- Queue Mode: `single` (shared queue - ไม่ซ้ำซ้อน)
- Prefetch: `1` (ประมวลผลทีละ message)
- MongoDB: Atomic operations (ป้องกัน race condition)
- RabbitMQ: Load balanced across instances

**Port Configuration:**
- Port 3003 ไม่ได้ expose ออกมาภายนอก
- Services เข้าถึงผ่าน internal network: `http://event-service:3003`
- Gateway: `http://localhost:3000` (external)

---

## คำสั่งที่มีประโยชน์

```bash
# ดู logs ของ instance เฉพาะ
docker logs birdie-bash-platform-event-service-1 -f

# ดู CPU/Memory usage
docker stats --filter "name=event-service"

# Stop และ remove instances
docker-compose down

# Scale แบบกำหนด instances
docker-compose up -d --scale event-service=5
```

---
