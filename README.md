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

2. Start infrastructure services with Docker:
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
```

4. Set up environment variables:
```bash
# Copy example files (already configured for Docker infrastructure)
cp auth-service/.env.example auth-service/.env
cp event-service/.env.example event-service/.env
cp gateway/.env.example gateway/.env
```

5. Start application services:
```bash
# Terminal 1 - Auth Service
cd auth-service && npm run dev

# Terminal 2 - Event Service  
cd event-service && npm run dev

# Terminal 3 - Gateway
cd gateway && npm run dev
```

### Development URLs (local)

- **Gateway API**: http://localhost:8080
- **Auth Service**: http://localhost:3001
- **Event Service**: http://localhost:3002
- **API Documentation**: http://localhost:8080/api-docs
- **RabbitMQ Management**: http://localhost:15672 (admin/password123)

### Alternative: Fully Local Setup

If you prefer to run everything locally without Docker:

#### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local installation)
- RabbitMQ (local installation)
- npm or yarn

## 🔧 Configuration

Each service requires its own `.env` file with specific configuration. See the `.env.example` files in each service directory for required variables.

### Common Environment Variables

- `PORT`: Service port number
- `NODE_ENV`: Environment (development/production)
- Database connection strings
- JWT secrets and expiration times

## 🛠️ Development

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

### Application Services (Local)

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

### API Documentation

Each service provides Swagger documentation:
- Auth Service: http://localhost:3001/api-docs
- Event Service: http://localhost:3002/api-docs
- Aggregated docs: http://localhost:8080/api-docs

## 🔐 Authentication Flow

1. User registers/logs in via Auth Service
2. Auth Service returns JWT token
3. Client includes token in Authorization header
4. Gateway validates token and forwards user context
5. Services receive user info via headers (x-user-id, x-user-email, x-user-role)
