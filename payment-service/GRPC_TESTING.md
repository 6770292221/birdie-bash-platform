# Payment Service gRPC Testing Guide

## Overview
The Payment Service provides gRPC endpoints for internal microservice communication with prompt-pay/QR code integration.

## Server Information
- **gRPC Server**: `localhost:50051`
- **Health Check**: `http://localhost:3003/health` (REST endpoint)
- **Proto File**: `./proto/payment.proto`

## Testing Tools

### 1. Postman (Recommended)
1. Import the collection: `postman/payment-service-grpc.postman_collection.json`
2. Install gRPC support in Postman
3. Load the proto file: `./proto/payment.proto`
4. Use the pre-configured requests

### 2. grpcurl (Command Line)
```bash
# Install grpcurl
brew install grpcurl  # macOS
# or
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# List services
grpcurl -plaintext localhost:50051 list

# List methods for PaymentService
grpcurl -plaintext localhost:50051 list payment.PaymentService

# Test IssueCharges
grpcurl -plaintext -d '{
  "event_id": "event_123",
  "player_id": "player_456", 
  "amount": 100.0,
  "currency": "THB",
  "description": "Event registration fee"
}' localhost:50051 payment.PaymentService/IssueCharges

# Test GetPaymentStatus
grpcurl -plaintext -d '{
  "payment_id": "your_payment_id_here"
}' localhost:50051 payment.PaymentService/GetPaymentStatus
```

### 3. BloomRPC (GUI Tool)
1. Download BloomRPC: https://github.com/bloomrpc/bloomrpc
2. Import proto file: `./proto/payment.proto`
3. Connect to: `localhost:50051`
4. Test endpoints with GUI interface

## API Endpoints

### IssueCharges
Creates a new payment with QR code data for prompt-pay.

**Request:**
```json
{
  "event_id": "event_123",
  "player_id": "player_456",
  "amount": 100.0,
  "currency": "THB",
  "description": "Event registration fee",
  "metadata": {
    "event_name": "Tournament 2025"
  }
}
```

**Response:**
```json
{
  "id": "payment_uuid",
  "status": 0,
  "amount": 100.0,
  "currency": "THB",
  "payment_intent_id": "PAY1694123456ABC123",
  "client_secret": "base64_encoded_qr_data",
  "created_at": 1694123456789,
  "updated_at": 1694123456789
}
```

### ConfirmPayment
Manually confirm a payment (MVP phase).

**Request:**
```json
{
  "payment_id": "payment_uuid",
  "payment_method_id": "manual_confirmation"
}
```

### RefundPayment
Process a refund (manual process in MVP).

**Request:**
```json
{
  "payment_id": "payment_uuid",
  "amount": 50.0,
  "reason": "Event cancelled"
}
```

### GetPaymentStatus
Get detailed payment information and transaction history.

**Request:**
```json
{
  "payment_id": "payment_uuid"
}
```

### GetPlayerPayments
Get all payments for a specific player.

**Request:**
```json
{
  "player_id": "player_456",
  "status": "2",  // Optional: 0=PENDING, 1=PROCESSING, 2=COMPLETED
  "event_id": "event_123"  // Optional: filter by event
}
```

## Payment Status Codes
- `0`: PENDING
- `1`: PROCESSING  
- `2`: COMPLETED
- `3`: FAILED
- `4`: REFUNDED
- `5`: PARTIALLY_REFUNDED
- `6`: CANCELLED

## QR Code Flow
1. Call `IssueCharges` to create payment
2. Extract `client_secret` (contains base64 QR data)
3. Frontend decodes and generates QR code
4. User scans QR and pays via prompt-pay/banking app
5. Admin manually confirms payment via `ConfirmPayment`

## Environment Variables
```bash
PORT=3003
GRPC_PORT=50051
PAYMENT_DB_URI=mongodb://localhost:27017/birdie_payments
COMPANY_BANK_ACCOUNT=xxx-x-xxxxx-x
PROMPT_PAY_ID=0xx-xxx-xxxx
NODE_ENV=development
```

## Example QR Data Structure
The `client_secret` contains base64 encoded JSON:
```json
{
  "type": "promptpay",
  "paymentReference": "PAY1694123456ABC123",
  "amount": 100.0,
  "currency": "THB",
  "recipientId": "0xx-xxx-xxxx",
  "bankAccount": "xxx-x-xxxxx-x"
}
```

## Troubleshooting

### Connection Issues
- Ensure gRPC server is running on port 50051
- Check firewall settings
- Verify proto file path

### Payment Issues
- Payments start in PENDING status
- Manual confirmation required in MVP
- Check database for payment records

### QR Code Issues
- Decode base64 `client_secret` to get QR data
- Frontend responsible for QR code generation
- Payment reference tracks the transaction