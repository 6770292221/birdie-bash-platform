# Birdie Bash Platform

A microservices-based platform for managing badminton events, players, and memberships. The platform provides authentication, event management, and API gateway services with comprehensive documentation.

## 🚀 Quick Start

### Hybrid Development Setup (Recommended)

This approach uses Docker for infrastructure services (MongoDB and RabbitMQ) while running application services locally for easier development and debugging.

#### Prerequisites

- Docker and Docker Compose
- Node.js (v18 or higher)
- npm or yarn
- Git

#### Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd birdie-bash-platform
```

2. **(Optional)** Open docker desktop and start infrastructure services with Docker:

```bash
docker-compose up -d
```

This starts:

- **MongoDB**: localhost:27017 (admin/password123)
- **RabbitMQ**: localhost:5672 with management UI at http://localhost:15672 (admin/password123)
- **MySQL**: localhost:3306 (root/root123)

3. Install dependencies for all application services:

```bash
# Auth Service
cd auth-service && npm install && cd ..

# Event Service
cd event-service && npm install && cd ..

# Gateway
cd gateway && npm install && cd ..

# Payment Service
cd payment-service && npm install && cd ..
npm run db:setup # Database setup (creating initial schema) using Prisma

# Settlement Service
cd settlement-service && npm install && cd ..

# Notification Service
cd notification-service && npm install && cd ..
```

4. Set up environment variables:

```bash
# Copy example files (already configured for Docker infrastructure)
cp auth-service/.env.example auth-service/.env
cp event-service/.env.example event-service/.env
cp gateway/.env.example gateway/.env
cp payment-service/.env.example payment-service/.env
cp settlement-service/.env.example settlement-service/.env
cp registration-service/.env.example registration-service/.env
cp notification-service/.env.example notification-service/.env
```

5. Start application services:

```bash
# Terminal 1 - Auth Service
cd auth-service && npm run dev

# Terminal 2 - Event Service  
cd event-service && npm run dev

# Terminal 3 - Gateway
cd gateway && npm run dev

# Terminal 4 - Payment Service
cd payment-service && npm run dev

# Terminal 5 - Settlement Service
cd settlement-service && npm run dev

# Terminal 6 - Registration Service
cd registration-service && npm run dev

# Terminal 7 - Notification Service
cd notification-service && npm run dev
```

## 🖥️ Development URLs (local)

- **Gateway API**: http://localhost:8080
- **Auth Service**: http://localhost:3001
- **Event Service**: http://localhost:3002
- **Payment Service**: http://localhost:3003, localhost:50051 (for gRPC)
- **Notification Service**: http://localhost:3007
- **API Documentation**: http://localhost:8080/api-docs
- **RabbitMQ Management**: http://localhost:15672 (admin/password123)

## 🔗 Payment Service Webhook Setup (Omise)

To receive payment webhook event from Omise, you'll need to set up a webhook endpoint:

#### 1. Expose Local Server

Use [ngrok](https://ngrok.com/) to make your local payment service accessible from the internet:

```bash
ngrok http 3003
```

Copy the generated public URL (e.g., `https://abcd1234.ngrok.io`)

#### 2. Configure Omise Webhook

1. **Create Account**: Register at [omise.co](https://www.omise.co/)
2. **Access Dashboard**: Go to [dashboard.omise.co](https://dashboard.omise.co/)
3. **Add Webhook**:
   - Navigate to **Settings** → **Webhooks**
   - Click **Add new webhook endpoint**
   - **URL**: `<your-ngrok-url>/webhooks/omise`
   - Save the configuration

#### 3. Test Webhook

1. Select events to monitor (e.g., "mark as paid", "mark as failed")
2. Go to **Charges** → **Your issued charges** to trigger test events
3. Verify webhook receives notifications in your payment service logs

## 🐳 Useful Docker Commands

#### Infrastructure Management (Docker)

```bash
# Start infrastructure services (MongoDB + RabbitMQ + MySQL + Mailhog)
docker-compose up -d

# Stop infrastructure services
docker-compose down

# View infrastructure logs
docker-compose logs -f

# Reset databases (remove volumes)
docker-compose down -v

# Check service status
docker-compose ps
```
