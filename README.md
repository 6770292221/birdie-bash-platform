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

2. **(Optional)** Start infrastructure services with Docker:

```bash
docker-compose up -d
```

This starts:

- **MongoDB**: localhost:27017 (admin/password123)
- **RabbitMQ**: localhost:5672 with management UI at http://localhost:15672 (admin/password123)

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

# Settlement Service
cd settlement-service && npm install && cd ..
```

4. Set up environment variables:

```bash
# Copy example files (already configured for Docker infrastructure)
cp auth-service/.env.example auth-service/.env
cp event-service/.env.example event-service/.env
cp gateway/.env.example gateway/.env
cp payment-service/.env.example payment-service/.env
cp settlement-service/.env.example settlement-service/.env
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
```

### Development URLs (local)

- **Gateway API**: http://localhost:8080
- **Auth Service**: http://localhost:3001
- **Event Service**: http://localhost:3002
- **Payment Service**: http://localhost:3003, localhost:50051 (for gRPC)
- **API Documentation**: http://localhost:8080/api-docs
- **RabbitMQ Management**: http://localhost:15672 (admin/password123)

## 🐳 Docker (Optional)

### Infrastructure Management (Docker)

```bash
# Start infrastructure services (MongoDB + RabbitMQ)
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
