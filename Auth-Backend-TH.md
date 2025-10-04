# ระบบยืนยันตัวตน Backend - Birdie Bash Platform

## ภาพรวม
ระบบยืนยันตัวตนของ Birdie Bash Platform ใช้สถาปัตยกรรม microservices โดยมี Gateway เป็นจุดเข้าหลักและ Auth Service เป็นบริการเฉพาะสำหรับการจัดการผู้ใช้

## สถาปัตยกรรม Backend

### 1. Gateway Service
- **หน้าที่**: จุดเข้าหลักของระบบ (Entry Point)
- **เทคโนโลยี**: Node.js + Express.js
- **Port**: 3000
- **การทำงาน**:
  - รับคำขอจาก Frontend
  - ส่งต่อคำขอไปยัง microservices ที่เหมาะสม
  - จัดการ routing และ load balancing

### 2. Auth Service
- **หน้าที่**: จัดการระบบยืนยันตัวตนทั้งหมด
- **เทคโนโลยี**: Node.js + Express.js + TypeScript
- **Port**: 3001
- **ฐานข้อมูล**: MongoDB
- **การทำงาน**:
  - ลงทะเบียนผู้ใช้ใหม่
  - เข้าสู่ระบบและออกจากระบบ
  - ตรวจสอบและรีเฟรช JWT Token
  - จัดการข้อมูลผู้ใช้

## กระบวนการทำงาน

### การลงทะเบียนผู้ใช้
```
Client → Gateway (3000) → Auth Service (3001) → MongoDB
```

1. **Gateway รับคำขอ**: `POST /api/auth/register`
2. **ส่งต่อไป Auth Service**: Gateway ส่งคำขอไป `http://auth-service:3001/api/auth/register`
3. **Auth Service ประมวลผล**:
   - ตรวจสอบข้อมูล (validation)
   - เข้ารหัสรหัสผ่านด้วย bcrypt (12 salt rounds)
   - บันทึกข้อมูลใน MongoDB
   - สร้าง JWT Token
4. **ส่งกลับผลลัพธ์**: Token และข้อมูลผู้ใช้

### การเข้าสู่ระบบ
```
Client → Gateway (3000) → Auth Service (3001) → MongoDB
```

1. **Gateway รับคำขอ**: `POST /api/auth/login`
2. **ส่งต่อไป Auth Service**
3. **Auth Service ตรวจสอบ**:
   - ค้นหาผู้ใช้จาก email
   - เปรียบเทียบรหัสผ่านกับ hash ใน database
   - สร้าง JWT Token ถ้าข้อมูลถูกต้อง
4. **ส่งกลับ Token**

### การทำงานของระบบ Authorization
```
Client → Gateway → Authorization Check → Target Service
```

**กระบวนการ**: Gateway ตรวจสอบ Token และสิทธิ์ทั้งหมด แล้วส่งต่อไป Service ปลายทาง

1. **Gateway รับ Request**: พร้อม `Authorization: Bearer <token>`
2. **Gateway ตรวจสอบ**:
   - ถอดรหัส JWT ด้วย `JWT_SECRET`
   - เช็คว่า login แล้ว (`requireAuth`)
   - เช็คสิทธิ์ admin ถ้าจำเป็น (`requireAdmin`)
3. **ส่งต่อไป Target Service**: พร้อม headers `x-user-id`, `x-user-role`

## API Endpoints และสิทธิ์ที่ต้องการ

### 🔓 **Public APIs** (ไม่ต้อง Login)
```bash
POST /api/auth/register    # ลงทะเบียน
POST /api/auth/login       # เข้าสู่ระบบ
```

### ⚠️ **Logout ปัจจุบัน** (Client-side Only)
```typescript
// Frontend ทำ logout เอง ไม่มี API endpoint
logout() {
  localStorage.removeItem('authToken');
  // ไม่เรียก server
}
```
**หมายเหตุ**: ระบบปัจจุบันยังไม่มี `/api/auth/logout` endpoint ใน Auth Service

### 🔒 **User APIs** (ต้อง Login)
```bash
# Event Management
GET  /api/events           # ดูรายการอีเวนต์
GET  /api/events/:id       # ดูรายละเอียดอีเวนต์

# Registration
POST /api/registration/events/:id/members     # สมัครเข้าร่วม (member)
POST /api/registration/events/:id/players/:pid/cancel  # ยกเลิกการสมัคร
GET  /api/registration/users/registrations    # ดูการสมัครของตัวเอง

# Venue
GET  /api/event/venues     # ดูรายการสนาม
GET  /api/event/venues/:id # ดูรายละเอียดสนาม

# Profile
GET  /api/auth/user/:id    # ดูโปรไฟล์
```

### 👑 **Admin APIs** (ต้อง Login + Admin Role)
```bash
# Event Management
POST   /api/events         # สร้างอีเวนต์
PUT    /api/events/:id     # แก้ไขอีเวนต์
PATCH  /api/events/:id     # อัปเดตอีเวนต์
DELETE /api/events/:id     # ลบอีเวนต์

# Registration Management
POST /api/registration/events/:id/guests     # เพิ่มแขก
GET  /api/registration/events/:id/players    # ดูรายการผู้เข้าร่วม

# Settlement
POST /api/settlements/issue      # ออกบิล
POST /api/settlements/calculate  # คำนวณยอดเงิน
GET  /api/settlements/:eventId  # ดูรายการชำระเงิน

# User Management
GET /api/auth/users        # ดูรายการผู้ใช้ทั้งหมด
```

## การกำหนดสิทธิ์ใน Gateway

### Route Configuration
```typescript
// gateway/src/routesConfig.ts
[
  // Public - ไม่ต้อง login
  { path: "/api/auth", target: authUrl, protected: false },

  // User - ต้อง login
  { path: "/api/registration/users/registrations", target: registrationUrl, protected: true },

  // Mixed - User อ่านได้, Admin จัดการได้
  {
    path: "/api/events",
    target: eventUrl,
    protected: true,
    adminForMethods: ["POST", "PUT", "PATCH", "DELETE"]
  },

  // Admin Only - ต้องเป็น admin เท่านั้น
  { path: "/api/settlements", target: settlementUrl, protected: true, adminRequired: true },
  { path: "/api/registration/events/:id/guests", target: registrationUrl, protected: true, adminRequired: true }
]
```

### Middleware Flow
```typescript
// ลำดับการตรวจสอบ
[
  attachUserFromJwt(JWT_SECRET),    // ถอดรหัส Token
  requireAuth,                      // เช็คว่า login แล้ว
  requireAdmin,                     // เช็ค admin (ถ้า adminRequired: true)
  requireAdminForMethods(),         // เช็ค admin สำหรับ method ที่กำหนด
  createProxyMiddleware()           // ส่งต่อไป Target Service
]
```

## ตัวอย่างการทำงานแบบ Step-by-Step

### สถานการณ์: Admin สร้างอีเวนต์ใหม่

**Request**: `POST /api/events`
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Badminton Tournament 2024",
    "date": "2024-02-15",
    "venueId": "venue123"
  }'
```

### Step 1: Gateway รับ Request
```typescript
// gateway/src/gateway.ts
app.use('/api/events', [
  attachUserFromJwt(JWT_SECRET),
  requireAuth,
  requireAdminForMethods(['POST', 'PUT', 'PATCH', 'DELETE']),
  createProxyMiddleware({ target: EVENT_SERVICE_URL })
]);
```

### Step 2: attachUserFromJwt() ทำงาน
```typescript
// gateway/src/middleware/auth.ts
const authHeader = req.headers.authorization; // "Bearer eyJhbG..."
const token = authHeader.substring(7);        // "eyJhbG..."

try {
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded;
  // req.user = {
  //   userId: "admin123",
  //   email: "admin@birdie.com",
  //   role: "admin",
  //   name: "Admin User"
  // }
} catch (error) {
  // Token ไม่ถูกต้อง แต่ไม่ error ที่นี่ ให้ requireAuth จัดการ
  req.user = null;
}
```

### Step 3: requireAuth() ตรวจสอบ
```typescript
// gateway/src/middleware/auth.ts
if (!req.user) {
  return res.status(401).json({
    success: false,
    error: "Authentication required",
    code: "AUTHENTICATION_REQUIRED"
  });
}
// ✅ req.user มีค่า = ผ่านการตรวจสอบ
```

### Step 4: requireAdminForMethods() ตรวจสอบ
```typescript
// gateway/src/middleware/auth.ts
const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
if (methods.includes(req.method)) { // POST อยู่ในลิสต์
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin privileges required",
      code: "INSUFFICIENT_PERMISSIONS",
      details: {
        userId: req.user.userId,
        currentRole: req.user.role,
        requiredRole: "admin"
      }
    });
  }
}
// ✅ req.user.role = "admin" = ผ่านการตรวจสอบ
```

### Step 5: ส่งต่อไป Event Service
```typescript
// gateway/src/middleware/auth.ts - forwardUserHeaders()
proxyReq.setHeader("x-user-id", req.user.userId);     // "admin123"
proxyReq.setHeader("x-user-role", req.user.role);     // "admin"

// gateway/src/gateway.ts - onProxyReq
console.log(`[GATEWAY] POST /api/events -> ${EVENT_SERVICE_URL}/api/events`);

// ส่งคำขอไป Event Service พร้อม:
// Headers:
//   - Authorization: Bearer eyJhbG...
//   - x-user-id: admin123
//   - x-user-role: admin
//   - Content-Type: application/json
// Body: { "name": "Badminton Tournament 2024", ... }
```

### Step 6: Event Service รับและประมวลผล
```typescript
// event-service รับ request พร้อม headers
// req.headers['x-user-id'] = "admin123"
// req.headers['x-user-role'] = "admin"

// Event Service สร้างอีเวนต์ใหม่ใน database
const newEvent = await Event.create({
  name: "Badminton Tournament 2024",
  date: "2024-02-15",
  venueId: "venue123",
  createdBy: req.headers['x-user-id'] // "admin123"
});

// ส่งกลับผลลัพธ์
res.status(201).json({
  success: true,
  data: newEvent,
  message: "Event created successfully"
});
```

### ผลลัพธ์สุดท้าย
```json
{
  "success": true,
  "data": {
    "id": "event456",
    "name": "Badminton Tournament 2024",
    "date": "2024-02-15T00:00:00.000Z",
    "venueId": "venue123",
    "createdBy": "admin123",
    "createdAt": "2024-01-20T10:30:00.000Z"
  },
  "message": "Event created successfully"
}
```

### สรุปการทำงาน
1. **Token Verification**: Gateway ตรวจสอบ JWT เอง (ไม่ต้องถาม Auth Service)
2. **Authorization**: Gateway เช็คสิทธิ์ admin เอง (ไม่ต้องถาม Auth Service)
3. **User Context**: Gateway ส่ง user info ผ่าน headers ไป Event Service
4. **Business Logic**: Event Service ใช้ user info ในการสร้างอีเวนต์
5. **Response**: ส่งผลลัพธ์กลับผ่าน Gateway ไปยัง Client

## Error Responses

### 401 - ไม่ได้ Login
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED"
}
```

### 403 - ไม่มีสิทธิ์
```json
{
  "error": "Admin privileges required",
  "code": "INSUFFICIENT_PERMISSIONS",
  "details": {
    "userId": "user123",
    "currentRole": "user",
    "requiredRole": "admin"
  }
}
```

## หลักการออกแบบและข้อดีของสถาปัตยกรรม

### 1. **Centralized Authentication & Authorization**
- **หลักการ**: ใช้ API Gateway เป็น single point of authentication
- **ข้อดี**:
  - ลดการซ้ำซ้อน (แต่ละ service ไม่ต้องเขียน auth เอง)
  - ง่ายต่อการควบคุมและแก้ไข policy
  - มี single point of control สำหรับ security
- **แนวปฏิบัติในอุตสาหกรรม**: ใช้กันจริงใน production เช่น Netflix Zuul, Kong, NGINX Gateway

```typescript
// Gateway เป็นจุดเดียวที่ตรวจสอบ JWT และ role
app.use(attachUserFromJwt(JWT_SECRET));
app.use('/api/events', requireAuth, requireAdminForMethods(['POST']));
```

### 2. **Separation of Concerns**
- **หลักการ**: แยก Auth Service ออกมาเป็น microservice เฉพาะ
- **ข้อดี**:
  - Service อื่นไม่ต้องยุ่งกับ logic การยืนยันตัวตน
  - แยกการพัฒนาและ deploy ได้อิสระ
  - ทีมต่างๆ สามารถทำงานแยกกันได้

```
Event Service   → เน้น business logic ของอีเวนต์
Auth Service    → เน้น authentication เท่านั้น
Gateway         → เน้น routing และ authorization
```

### 3. **Stateless Authentication ด้วย JWT**
- **หลักการ**: ใช้ JWT ในการยืนยันตัวตน
- **ข้อดี**:
  - ระบบ scale ง่าย ไม่ต้องเก็บ session state ฝั่ง server
  - Service หลายตัวใช้ JWT_SECRET เดียวกันได้
  - ลด memory usage และ database calls

```typescript
// ไม่ต้องเก็บ session ใน database
const decoded = jwt.verify(token, JWT_SECRET); // ข้อมูลอยู่ใน token เอง
```

### 4. **Role-Based Access Control (RBAC)**
- **หลักการ**: มีการตรวจสอบ role (admin, user) ที่ Gateway
- **ข้อดี**:
  - Route config แยก Public / User / Admin ชัดเจน
  - เปลี่ยน permission ได้ที่ Gateway เพียงที่เดียว
  - Security policy มีมาตรฐานเดียวกัน

```typescript
// Declarative configuration
{ path: "/api/events", adminForMethods: ["POST", "PUT", "DELETE"] }
{ path: "/api/settlements", adminRequired: true }
```

### 5. **Gateway Injects User Context (User Context Propagation)**
- **หลักการ**: Gateway ตรวจสอบแล้ว → inject userId และ role ให้ downstream service
- **ข้อดี**:
  - Service ปลายทางโฟกัสแค่ business logic
  - ไม่ต้องตรวจสอบ token ซ้ำที่ทุก service
  - ลดการพึ่งพา Auth Service
- **Pattern ที่ใช้**: "propagated identity" หรือ "user context forwarding"

```typescript
// Gateway ส่ง user context ผ่าน headers
proxyReq.setHeader("x-user-id", req.user.userId);
proxyReq.setHeader("x-user-role", req.user.role);

// Event Service ใช้ได้เลย ไม่ต้องตรวจสอบ token
const createdBy = req.headers['x-user-id'];
```

### 6. **Error Handling มีมาตรฐาน**
- **หลักการ**: แยก error types และมี response format ที่สม่ำเสมอ
- **ข้อดี**:
  - Frontend รู้ได้ชัดเจนว่าปัญหาคืออะไร
  - Debug ง่าย มี error code และ details
  - UX ดีขึ้น แสดง error message ที่เหมาะสม

```json
// 401 - ยังไม่ login
{ "code": "AUTHENTICATION_REQUIRED", "error": "Authentication required" }

// 403 - ไม่มีสิทธิ์
{ "code": "INSUFFICIENT_PERMISSIONS", "details": { "requiredRole": "admin" } }
```

### 7. **Security Best Practices**
- **หลักการ**: ใช้ security มาตรฐานอุตสาหกรรม
- **การใช้งาน**:
  - รหัสผ่านเข้ารหัสด้วย bcrypt (12 salt rounds)
  - JWT มีวันหมดอายุ (7 วัน)
  - Input validation ก่อนบันทึกลง database
  - CORS configuration และ security headers

```typescript
// Password hashing
const hashedPassword = await bcrypt.hash(password, 12);

// JWT expiration
jwt.sign(payload, secret, { expiresIn: '7d' });
```

### 8. **Scalability & Maintainability**
- **หลักการ**: แยก service ตามหน้าที่ และ config แบบ declarative
- **ข้อดี**:
  - แยก service ตามหน้าที่ → scale แยกกันได้
  - Gateway config แบบ declarative → ปรับแก้ route หรือ rule ได้ง่าย
  - เพิ่ม service ใหม่ได้โดยไม่กระทบของเดิม

```typescript
// เพิ่ม service ใหม่ง่ายๆ
const routes = [
  { path: "/api/events", target: eventUrl },
  { path: "/api/payments", target: paymentUrl }, // ← เพิ่มใหม่
];
```

### 9. **Internal Trust Boundary**
- **หลักการ**: Service ภายในไม่ต้องตรวจ token/API key → ลด latency และ complexity
- **ข้อดี**:
  - ลดการเรียก Auth Service ซ้ำซ้อน
  - เพิ่มประสิทธิภาพของระบบ
  - ลดความซับซ้อนของ service ปลายทาง
- **เงื่อนไข**: เหมาะสมถ้า network ภายในถูกควบคุม (เช่นอยู่ใน private VPC หรือ service mesh)

```typescript
// Service ภายในไม่ต้องตรวจสอบ token อีก
// เพียงแค่อ่าน user context จาก headers
const userId = req.headers['x-user-id'];    // เชื่อถือได้จาก Gateway
const userRole = req.headers['x-user-role']; // ไม่ต้องไป verify token
```

---

## จุดที่ถูกต้องตามหลักของระบบยืนยันตัวตน

1. **Centralized Authentication**
   - ใช้ API Gateway เป็นจุดตรวจสอบสิทธิ์เดียว (Single Entry Point)  
   - ลดความซ้ำซ้อนและควบคุมได้ง่ายขึ้น

2. **Separation of Concerns**
   - แยก Auth Service ออกมาเฉพาะ  
   - ทำให้ microservices อื่น ๆ โฟกัสเฉพาะ business logic

3. **Stateless Authentication (JWT)**
   - ใช้ JWT เป็นมาตรฐาน → ขยายระบบง่าย ไม่ต้องเก็บ session state ฝั่ง server  
   - Token มีวันหมดอายุ ปลอดภัยยิ่งขึ้น

4. **Role-Based Access Control (RBAC)**
   - แยก Public API / User API / Admin API ชัดเจน  
   - Gateway ตรวจสอบสิทธิ์ admin ก่อนส่งต่อไปยัง service ปลายทาง

5. **Security Best Practices**
   - Password hashing ด้วย bcrypt (12 salt rounds)  
   - Input validation ก่อนบันทึกลง DB  
   - JWT ลงนามด้วย secret key และมีวันหมดอายุ

6. **User Context Propagation**
   - Gateway ตรวจสอบ token แล้วส่งค่า `x-user-id` และ `x-user-role` ไปยัง service  
   - ลดภาระการตรวจสอบซ้ำที่ service ปลายทาง

7. **Standardized Error Handling**
   - แยก 401 (Authentication required) และ 403 (Forbidden) อย่างชัดเจน  
   - Response format เป็น JSON ที่อ่านง่ายและ client นำไปใช้ต่อได้สะดวก

8. **Scalability & Maintainability**
   - ระบบออกแบบแบบ microservices → scale ได้อิสระตามโหลด  
   - Route configuration ที่ Gateway ทำให้เพิ่ม/แก้ policy ได้ง่าย
