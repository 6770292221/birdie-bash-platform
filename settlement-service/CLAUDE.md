# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm run dev` - Start development server with nodemon and ts-node
- `npm run grpc:dev` - Start gRPC server in development mode
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run compiled production server

### Protocol Buffers
- `npm run proto:generate` - Generate TypeScript types from proto files

## Architecture Overview

This is the **Settlement Service** for the Birdie Bash Platform - a microservice architecture using both HTTP and gRPC protocols.

### Service Architecture
- **HTTP Server**: Express.js server with RESTful API endpoints (port 3004 by default)
- **RESTful API**: Complete settlement operations API that proxies to gRPC Payment Service
- **gRPC Communication**: Uses protobuf definitions for inter-service communication with the Payment Service
- **Database**: MongoDB connection via Mongoose for settlement data storage

### Key Components

1. **Server Entry Point** (`src/server.ts`):
   - Express app with RESTful API endpoints
   - Settlement routes mounting at `/api/settlements`
   - Health check endpoint at `/health`
   - Database connection initialization
   - Error handling middleware

2. **Settlement Routes** (`src/routes/settlementRoutes.ts`):
   - RESTful endpoints for settlement operations
   - Proxies HTTP requests to gRPC Payment Service
   - Handles request validation and response formatting

3. **gRPC Client** (`src/clients/paymentClient.ts`):
   - Client for communicating with Payment Service
   - Implements all payment operations: IssueCharges, ConfirmPayment, RefundPayment, GetPaymentStatus, GetPlayerPayments
   - Uses protobuf definitions from `proto/payment.proto`

4. **Database Configuration** (`src/config/settlementDatabase.ts`):
   - MongoDB connection handling
   - Connection error handling and logging
   - Uses environment variable `SETTLEMENT_DB_URI` for connection string

5. **Protocol Definitions** (`proto/payment.proto`):
   - Defines gRPC service interface with Payment Service
   - Payment status enums and transaction types
   - Request/response message structures

### Project Structure
```
src/
├── clients/         # gRPC clients for external services
├── config/          # Database and service configuration
├── middleware/      # Express middleware (error handling)
├── routes/          # RESTful API route handlers
├── utils/           # Utilities (logging)
└── server.ts        # Main HTTP server entry point

proto/               # Protocol buffer definitions
```

### RESTful API Endpoints

All endpoints are prefixed with `/api/settlements`:

- `POST /charges` - Issue settlement charges
- `PUT /:settlement_id/confirm` - Confirm settlement payment
- `POST /:settlement_id/refund` - Refund settlement payment
- `GET /:settlement_id/status` - Get settlement status
- `GET /player/:player_id` - Get all settlements for a player

### Environment Variables
- `PORT` - HTTP server port (default: 3004)
- `GRPC_PORT` - gRPC server port reference (default: 50051)
- `SETTLEMENT_DB_URI` - MongoDB connection string

### Development Notes
- The service is designed as part of a microservices architecture
- RESTful API endpoints proxy requests to gRPC Payment Service
- Settlement service acts as an HTTP-to-gRPC bridge
- Uses TypeScript with strict compilation
- MongoDB connection fails gracefully to allow service startup
- All API responses follow consistent JSON format with success/error handling