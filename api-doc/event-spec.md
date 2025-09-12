# 📘 Event API Specification

API สำหรับจัดการอีเวนต์ เช่น การสร้าง ดูรายละเอียด อัปเดต และยกเลิกอีเวนต์ รวมถึงการตรวจสอบสถานะและจำนวนที่นั่ง

---

## 📍 Endpoints (base path: `/api`)

- **POST `/api/events`** → สร้างอีเวนต์ใหม่  
- **GET `/api/events/{eventId}`** → ดูรายละเอียดอีเวนต์  
- **GET `/api/events/{eventId}/status`** → เช็คสถานะ/จำนวนที่นั่ง  
- **PUT `/api/events/{eventId}`** → อัปเดตอีเวนต์  
- **DELETE `/api/events/{eventId}`** → ยกเลิกอีเวนต์  

---

## 📦 Event Object (โครงสร้างข้อมูล)

```json
{
  "eventId": "68c449a4de8ff57971d4084c",
  "name": "Friday Night Badminton",
  "description": "Friendly badminton session for intermediate players.",
  "time": {
    "date": "2025-09-12",
    "startTime": "18:00",
    "endTime": "21:00",
    "durationMinutes": 180
  },
  "location": {
    "name": "Bangkok Sports Complex - Hall A",
    "mapUrl": "https://maps.google.com/?q=Bangkok+Sports+Complex"
  },
  "capacity": {
    "maxParticipants": 12,
    "currentParticipants": 5,
    "availableSlots": 7,
    "waitlistEnabled": false
  },
  "status": {
    "state": "active",
    "isAcceptingRegistrations": true
  },
  "payment": {
    "pricePerPerson": 100,
    "currency": "THB",
    "paymentRequired": true,
    "cancellationPolicy": "Refund 50% if canceled 24h before event"
  },
  "createdAt": "2025-09-01T10:00:00Z",
  "updatedAt": "2025-09-10T15:30:00Z"
}
```

---

## 📝 Field Explanation

### 🔹 General
- **eventId** (string) → ไอดีเฉพาะของอีเวนต์ (MongoDB ObjectId หรือ UUID)  
- **name** (string) → ชื่ออีเวนต์ เช่น `"Friday Night Badminton"`  
- **description** (string) → รายละเอียดของอีเวนต์  

### 🔹 Time
- **date** (string, `YYYY-MM-DD`) → วันที่จัดอีเวนต์  
- **startTime** (string, `HH:mm`) → เวลาเริ่ม  
- **endTime** (string, `HH:mm`) → เวลาสิ้นสุด  
- **durationMinutes** (number) → ความยาวอีเวนต์ (นาที)  

### 🔹 Location
- **name** (string) → ชื่อสถานที่ เช่น `"Bangkok Sports Complex - Hall A"`  
- **mapUrl** (string, optional) → Google Maps link  

### 🔹 Capacity
- **maxParticipants** (number) → จำนวนผู้เข้าร่วมสูงสุด  
- **currentParticipants** (number) → จำนวนที่ลงทะเบียนแล้ว  
- **availableSlots** (number) → ช่องว่างที่เหลือ (`max - current`) [คำนวณโดยระบบ]  
- **waitlistEnabled** (boolean) → เปิดระบบ Waiting List หรือไม่ [คำนวณโดยระบบ: true เมื่อ `state=active` และ `availableSlots <= 0`]  

### 🔹 Status
- **state** (enum: `active | canceled | completed`) → สถานะอีเวนต์  
- **isAcceptingRegistrations** (boolean) → เปิดรับสมัครหรือไม่ [คำนวณโดยระบบ: true เมื่อ `state=active` และ `availableSlots > 0`]  

### 🔹 Payment
- **pricePerPerson** (number) → ราคาต่อคน  
- **currency** (string, ISO 4217) → สกุลเงิน เช่น `"THB"`, `"USD"`  
- **paymentRequired** (boolean) → ต้องจ่ายล่วงหน้าหรือไม่  
- **cancellationPolicy** (string) → กฎยกเลิก เช่น `"Refund 50% if cancelled 24h before event"`  

### 🔹 Audit
- **createdBy** (string) → userId ของผู้สร้าง event  
- **createdAt** (datetime, ISO8601) → เวลาที่สร้าง  
- **updatedAt** (datetime, ISO8601) → เวลาที่อัปเดตล่าสุด  

---

## 📖 ตัวอย่าง Response

### ✅ Create Event (`POST /api/events`)
```json
{
  "eventId": "68c449a4de8ff57971d4084c",
  "name": "Friday Night Badminton",
  "time": { 
    "date": "2025-09-12", 
    "startTime": "18:00", 
    "endTime": "21:00" 
  },
  "location": { 
    "name": "Bangkok Sports Complex - Hall A" 
  },
  "capacity": { 
    "maxParticipants": 12, 
    "currentParticipants": 0,
    "availableSlots": 12,
    "waitlistEnabled": false
  },
  "status": { 
    "state": "active",
    "isAcceptingRegistrations": true
  },
  "payment": { 
    "pricePerPerson": 100, 
    "currency": "THB", 
    "paymentRequired": true 
  },
  "createdAt": "2025-09-01T10:00:00Z",
  "updatedAt": "2025-09-01T10:00:00Z"
}
```

ℹ️ หมายเหตุ: หาก client ส่งค่า `availableSlots`, `waitlistEnabled`, หรือ `isAcceptingRegistrations` เข้ามา ระบบจะคำนวณทับโดยอัตโนมัติจาก `capacity.maxParticipants`, `capacity.currentParticipants`, และ `status.state` รวมถึง `time.durationMinutes` จะคำนวณจาก `startTime` → `endTime` หากไม่ส่งมา
