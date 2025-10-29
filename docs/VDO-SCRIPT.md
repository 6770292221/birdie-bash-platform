# 🎬 VDO Presentation Script: Service Discovery & Non-Functional Requirements

**Project:** Birdie Bash Platform
**Duration:** ≈ 5 minutes

---

## 🧭 Overview

วิดีโอนี้อธิบายแนวคิด **Service Discovery** และความสัมพันธ์กับ **Non-Functional Requirements (NFRs)**
ภายในโปรเจกต์ **Birdie Bash Platform** — ระบบจองคอร์ทแบดมินตันที่ใช้ **Microservices Architecture**
ซึ่งประกอบด้วย 8 services ที่เชื่อมต่อกันผ่าน Docker Network เดียวกัน

---

## 🗂️ Presentation Flow

| ลำดับ          | หัวข้อ                        | เวลาโดยประมาณ |
| :------------- | :---------------------------- | :------------ |
| 1              | เปิดเรื่องและภาพรวม           | 0:30 นาที     |
| 2              | System Architecture Overview  | 1:00 นาที     |
| 3              | Two-Layer Communication Model | 0:45 นาที     |
| 4              | Demo Part 1 – Start Services  | 1:00 นาที     |
| 5              | Demo Part 2 – ตรวจสอบ DNS     | 0:45 นาที     |
| 6              | สรุป NFRs 6 ข้อ               | 0:45 นาที     |
| 7              | สรุปและปิดท้าย                | 0:15 นาที     |
| **รวมทั้งหมด** | **≈ 5 นาที**                  |               |

---

## 🎤 Script for Presentation

### 🕐 Section 1 – เปิดเรื่องและภาพรวม (0:00–0:30)

> สวัสดีครับ วันนี้ผมจะนำเสนอหัวข้อ **Service Discovery และ Non-Functional Requirements**
> ของโปรเจกต์ **Birdie Bash Platform** ครับ
>
> โปรเจกต์นี้เป็นระบบจองคอร์ทแบดมินตันที่ใช้ **Microservices Architecture**
> ซึ่งประกอบด้วยทั้งหมด 8 services ที่สื่อสารกันภายใน **Docker Network เดียวกัน**
>
> ในวิดีโอนี้ ผมจะอธิบาย 2 ส่วนหลัก คือ **ภาพรวมสถาปัตยกรรมระบบ** และ **การสาธิต Service Discovery จริงใน Docker**

---

### 🖥️ Section 2 – System Architecture Overview (0:30–1:30)

![architecture-diagram](./diagram-architecture.png)

> ภาพนี้แสดงสถาปัตยกรรมของระบบ Birdie Bash Platform ทั้งหมด
>
> ชั้นบนสุดคือ **Client Layer** ผู้ใช้เข้าสู่ระบบผ่าน HTTPS Port 443
>
> ชั้นที่สองคือ **API Gateway (Port 3000)** ซึ่งทำหน้าที่เป็น **Single Entry Point**
> ตรวจสอบสิทธิ์ด้วย **JWT Authentication** ก่อนส่งต่อไปยัง services ต่าง ๆ
>
> ถัดลงมาคือ **Microservices Layer** ซึ่งมี 7 ตัวหลัก ได้แก่ Auth, Event, Registration, Settlement, Notification, Matching และ Payment
>
> โดยเฉพาะ **Payment Service** ใช้ gRPC แทน HTTP เพื่อให้ทำงานได้เร็วขึ้นกว่า 3–5 เท่า
>
> ชั้นล่างสุดคือ **Infrastructure Layer** ซึ่งมี PostgreSQL, RabbitMQ , MongoDB
>
> Services ทั้งหมดนี้เชื่อมต่อกันผ่าน **DNS-based Service Discovery** ภายใน network ชื่อ `birdie-network`
> Docker จะ resolve ชื่อ container ให้เป็น IP address โดยอัตโนมัติ

---

### 🌐 Section 3 – Two-Layer Communication Model (1:30–2:15)

![two-layer-model](./diagram-layers.png)

> ระบบนี้สื่อสารกันผ่าน 2 ชั้นหลัก คือ
>
> **Layer 1 – Service Discovery (DNS)**
> Docker ทำหน้าที่เป็น DNS ภายใน `birdie-network`
> ตัวอย่างเช่น
>
> ```
> auth-service → 172.20.0.2
> event-service → 172.20.0.3
> payment-service → 172.20.0.8
> ```
>
> **Layer 2 – Communication Protocol**
> หลังจาก DNS resolve แล้ว services จะสื่อสารกันผ่าน protocol ที่กำหนด
>
> * 6 ตัวใช้ HTTP
> * 1 ตัวคือ Payment ใช้ gRPC
>
> ดังนั้น DNS ตอบคำถาม “เจอกันได้อย่างไร” ส่วน Protocol ตอบคำถาม “คุยกันอย่างไร”

---

### ⚙️ Section 4 – Demo Part 1 : Start Services (2:15–3:15)

```bash
pwd
# /Users/.../birdie-bash-platform
```

> เรามาดูว่า docker-compose.yml ตั้งค่า network อย่างไร

```bash
cat docker-compose.yml | grep -A 8 "networks:"
```

**ผลลัพธ์:**

```yaml
networks:
  birdie-network:
    driver: bridge

services:
  gateway:
    networks:
      - birdie-network
  auth-service:
    networks:
      - birdie-network
  event-service:
    networks:
      - birdie-network
```

> เห็นได้ว่า เราสร้าง network ชื่อ **birdie-network** แบบ bridge
>
> แล้วให้ทุก service เชื่อมต่อกับ network นี้
>
> Docker จะทำ **DNS server อัตโนมัติ** ภายใน network นี้
>
> ทำให้ทุก service สามารถเรียกกันด้วย **ชื่อ** แทน IP address

---

> จากนั้นเริ่มรันระบบทั้งหมดด้วยคำสั่ง:

```bash
docker-compose up -d
```

**ผลลัพธ์:**

```
Creating network "birdie-network" with driver "bridge"
Creating postgres ... done
Creating rabbitmq ... done
Creating redis ... done
Creating auth-service ... done
Creating event-service ... done
Creating registration ... done
Creating settlement ... done
Creating notification ... done
Creating matching-service ... done
Creating payment-service ... done
Creating gateway ... done
```

> Docker จะสร้าง network และลงทะเบียน container ทั้งหมดใน DNS โดยอัตโนมัติ

---

### 🔍 Section 5 – Demo Part 2 : ตรวจสอบ DNS (3:15–4:00)

> ตรวจสอบ services ที่รันอยู่ในระบบ:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**ผลลัพธ์:**

```
NAMES                        STATUS              PORTS
birdie-gateway               Up 24 hours         0.0.0.0:3000->3000/tcp
birdie-auth-service          Up 24 hours         0.0.0.0:3001->3001/tcp
birdie-event-service         Up 24 hours         0.0.0.0:3003->3003/tcp
birdie-registration-service  Up 24 hours         0.0.0.0:3004->3004/tcp
birdie-settlement-service    Up 24 hours         0.0.0.0:3006->3006/tcp
birdie-notification-service  Up 24 hours         0.0.0.0:3007->3007/tcp
birdie-matching-service      Up 24 hours         0.0.0.0:3008->3008/tcp
birdie-payment-service       Up 24 hours         0.0.0.0:50051->50051/tcp
```

> เห็นได้ว่า **services ทั้ง 8 ตัวรันอยู่ครบแล้ว**
>
> Gateway port 3000, Auth 3001, Event 3003, Registration 3004, Settlement 3006, Notification 3007, Matching 3008
>
> และ **Payment ใช้ port 50051** เพราะใช้ gRPC แทน HTTP

---

> ตรวจสอบ IP Mapping ภายใน network:

```bash
docker network inspect birdie-bash-platform_birdie-network \
    --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'
```

**ผลลัพธ์:**

```
birdie-gateway: 172.18.0.13/16
birdie-auth-service: 172.18.0.8/16
birdie-event-service: 172.18.0.9/16
birdie-registration-service: 172.18.0.11/16
birdie-settlement-service: 172.18.0.10/16
birdie-notification-service: 172.18.0.12/16
birdie-matching-service: 172.18.0.7/16
birdie-payment-service: 172.18.0.5/16
birdie-mongodb: 172.18.0.6/16
birdie-mysql: 172.18.0.4/16
birdie-rabbitmq: 172.18.0.3/16
```

> Docker ได้ assign IP address ให้กับแต่ละ container และลงทะเบียนชื่อใน DNS อัตโนมัติ

---

> ทดสอบ DNS Resolution จาก Gateway:

```bash
docker exec birdie-gateway nslookup auth-service
```

**ผลลัพธ์:**

```
Server:    127.0.0.11
Address:   127.0.0.11:53

Non-authoritative answer:
Name:      auth-service
Address:   172.18.0.8
```

> Gateway ถาม Docker DNS (127.0.0.11) ว่า `auth-service` อยู่ที่ IP ไหน
>
> DNS ตอบกลับมาว่า `172.18.0.8` ✓

---

```bash
docker exec birdie-gateway nslookup payment-service
```

**ผลลัพธ์:**

```
Server:    127.0.0.11
Address:   127.0.0.11:53

Non-authoritative answer:
Name:      payment-service
Address:   172.18.0.5
```

> เห็นได้ว่า **payment-service ก็ใช้ DNS เหมือนกัน!**
>
> หาเจอผ่าน DNS (Layer 1) → `172.18.0.5` แล้วค่อยใช้ gRPC คุยกัน (Layer 2)
>
> **นี่คือ Service Discovery ที่ทำงานจริง ไม่ต้อง hardcode IP address เลย!**

---

### ⚡ Section 6 – Non-Functional Requirements (4:00–4:45)

| #  | คุณลักษณะ           | แนวทางที่ใช้                                                                                              |
| :- | :------------------ | :-------------------------------------------------------------------------------------------------------- |
| 1  | **Scalability**     | Scale ได้ด้วย `docker-compose --scale` (ต้องลบ container_name ก่อน) + DNS load-balance อัตโนมัติ         |
| 2  | **Availability**    | RabbitMQ persistence + health check ทุก service + auto restart + DNS auto update                         |
| 3  | **Maintainability** | ใช้ชื่อ service แทน IP (เช่น `auth-service:3001`) แก้ง่าย ไม่กระทบกัน                                    |
| 4  | **Security**        | Gateway เป็น entry point หลัก + JWT Auth + Docker network isolation                                      |
| 5  | **Performance**     | ใช้ gRPC สำหรับ Payment (เร็วกว่า 3-5 เท่า) + RabbitMQ async processing + DNS caching                    |
| 6  | **Reliability**     | RabbitMQ message acknowledgment + retry logic (RABBIT_RETRY_MS:2000) + stable DNS naming                  |

> จากตาราง NFRs ทั้ง 6 ข้อ สังเกตว่า **Service Discovery ช่วยทุกข้อเลย**
>
> - **Scalability:** DNS จัดการ load-balance อัตโนมัติเมื่อมีหลาย instances
> - **Availability:** DNS update อัตโนมัติเมื่อ service restart + health checks
> - **Maintainability:** ใช้ชื่อ service อ่านง่าย ไม่ต้องจำ IP
> - **Security:** Services อยู่ใน Docker private network เข้าถึงผ่าน DNS เท่านั้น
> - **Performance:** DNS caching ลดเวลา lookup + gRPC protocol สำหรับ Payment
> - **Reliability:** DNS naming ไม่เปลี่ยน ป้องกัน misrouting + retry logic

---

#### 💡 ตัวอย่าง: Scalability Demo (Optional - ถ้ามีเวลา)

> มาดูตัวอย่าง Scalability กันครับ สมมติว่าเรามี event เยอะขึ้น ต้องการเพิ่ม capacity

**⚠️ หมายเหตุ:** ก่อน demo ต้องลบ `container_name` ออกจาก event-service ใน docker-compose.yml ก่อน เพราะ Docker ต้องการ unique name สำหรับแต่ละ instance

```yaml
# docker-compose.yml
event-service:
  build: ./event-service
  # container_name: birdie-event-service  # ← comment ออกเพื่อให้ scale ได้
  ports:
    - "3003:3003"
```

```bash
docker-compose up -d --scale event-service=3
```

**ผลลัพธ์:**

```
[+] Running 11/11
 ✔ Container birdie-bash-platform-event-service-1  Running
 ✔ Container birdie-bash-platform-event-service-2  Started
 ✔ Container birdie-bash-platform-event-service-3  Started
```

> ตรวจสอบว่ามีกี่ instance:

```bash
docker ps --filter "name=event-service" --format "table {{.Names}}\t{{.Status}}"
```

**ผลลัพธ์:**

```
NAMES                                      STATUS
birdie-bash-platform_event-service_1       Up 2 minutes
birdie-bash-platform_event-service_2       Up 10 seconds
birdie-bash-platform_event-service_3       Up 10 seconds
```

> เห็นไหมครับ ตอนนี้มี **event-service 3 instances** แล้ว
>
> แต่ Gateway ยังเรียก `http://event-service:3003` เหมือนเดิม
>
> **Docker DNS จะ load-balance อัตโนมัติ** ระหว่าง 3 instances แบบ round-robin
>
> ไม่ต้องแก้ code เลย! นี่คือ **Scalability** ที่ Service Discovery ช่วยให้ทำได้ง่าย

---

### 🏁 Section 7 – สรุปและปิดท้าย (4:45–5:00)

> สรุปแล้ว **DNS-based Service Discovery** ทำให้ services ทุกตัวเชื่อมต่อกันได้อัตโนมัติ
> โดยไม่ต้อง hardcode IP
>
> โครงสร้างแบบ **Two-Layer Model** (DNS + Protocol) ช่วยให้ระบบมีความยืดหยุ่น เสถียร และรองรับการขยายตัวได้ดี
>
> นอกจากนี้ยังสนับสนุน Non-Functional Requirements ครบทั้ง 6 ข้อ
>
> Service Discovery จึงเป็นพื้นฐานสำคัญของระบบ microservices ที่ต้องการความปลอดภัย ความเชื่อถือได้ และประสิทธิภาพในระยะยาว
>
> ขอบคุณครับ 🙏

---