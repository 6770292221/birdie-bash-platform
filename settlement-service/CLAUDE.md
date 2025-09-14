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
- **HTTP Server**: Minimal Express.js server providing only a `/health` endpoint (port 3004 by default)
- **gRPC Communication**: Uses protobuf definitions for inter-service communication with the Payment Service
- **Database**: MongoDB connection via Mongoose for settlement data storage

### Key Components

1. **Server Entry Point** (`src/server.ts`):
   - Express app with health check endpoint only
   - Database connection initialization
   - Error handling middleware

2. **gRPC Client** (`src/clients/paymentClient.ts`):
   - Client for communicating with Payment Service
   - Implements all payment operations: IssueCharges, ConfirmPayment, RefundPayment, GetPaymentStatus, GetPlayerPayments
   - Uses protobuf definitions from `proto/payment.proto`

3. **Database Configuration** (`src/config/settlementDatabase.ts`):
   - MongoDB connection handling
   - Connection error handling and logging
   - Uses environment variable `SETTLEMENT_DB_URI` for connection string

4. **Protocol Definitions** (`proto/payment.proto`):
   - Defines gRPC service interface with Payment Service
   - Payment status enums and transaction types
   - Request/response message structures

### Project Structure
```
src/
├── clients/         # gRPC clients for external services
├── config/          # Database and service configuration
├── middleware/      # Express middleware (error handling)
├── utils/           # Utilities (logging)
└── server.ts        # Main HTTP server entry point

proto/               # Protocol buffer definitions
```

### Environment Variables
- `PORT` - HTTP server port (default: 3004)
- `GRPC_PORT` - gRPC server port reference (default: 50051)
- `SETTLEMENT_DB_URI` - MongoDB connection string

### Development Notes
- The service is designed as part of a microservices architecture
- HTTP endpoints are minimal - main functionality through gRPC
- Payment Client is currently example code for future microservice communication
- Uses TypeScript with strict compilation
- MongoDB connection fails gracefully to allow service startup