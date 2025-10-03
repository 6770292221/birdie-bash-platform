import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { prisma } from './config/paymentDatabase';
import { PAYMENT_STATUS, isPaymentStatus, PaymentStatusValue } from './constants/paymentStatus';
import { issueCharge } from './services/paymentService';
import { Logger } from './utils/logger';

// Load the protobuf definition
const PROTO_PATH = path.join(__dirname, '../proto/payment.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const paymentProto = grpc.loadPackageDefinition(packageDefinition).payment as any;

// Validate status strictly (now using string constants)
function validateStatusOrThrow(input: any): PaymentStatusValue {
  if (input === undefined || input === null) {
    throw new Error('Status value is required');
  }
  const raw = String(input).trim().toUpperCase();
  if (isPaymentStatus(raw)) return raw;
  const valid = Object.values(PAYMENT_STATUS).join(', ');
  throw new Error(`Invalid status value. Allowed: ${valid}`);
}

// gRPC service implementations
const grpcService = {
  async issueCharges(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
    try {
      const request = call.request;
      Logger.grpc('IssueCharges request received', request);
      const result = await issueCharge({
        player_id: request.player_id,
        amount: request.amount,
        event_id: request.event_id,
        currency: request.currency,
        payment_method: request.payment_method,
        description: request.description
      });
      callback(null, result);
    } catch (error) {
      Logger.error('gRPC issueCharges error', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async getPaymentStatus(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
    try {
      const request = call.request;
      
      if (!request.payment_id) {
        callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Payment ID is required'
        });
        return;
      }

      const payment = await prisma.payment.findUnique({ 
        where: { id: request.payment_id },
        include: { transactions: true }
      });
      if (!payment) {
        callback({
          code: grpc.status.NOT_FOUND,
          message: 'Payment not found'
        });
        return;
      }

      const response = {
        payment_id: payment.id,
  status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        event_id: payment.eventId,
        player_id: payment.playerId,
        created_at: payment.createdAt.toISOString(),
        updated_at: payment.updatedAt.toISOString(),
        transactions: payment.transactions.map((tx) => ({
          id: tx.id,
          type: 0, // only 'charge'
          amount: tx.amount,
          status: tx.status,
          transaction_id: tx.transactionId,
          timestamp: tx.timestamp.toISOString()
        }))
      };

      callback(null, response);
    } catch (error) {
      console.error('gRPC getPaymentStatus error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async getPlayerPayments(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
    try {
      const request = call.request;
      
      if (!request.player_id) {
        callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Player ID is required'
        });
        return;
      }

      const filter: any = { playerId: request.player_id };
      if (request.status) {
        try {
          filter.status = validateStatusOrThrow(request.status);
        } catch (e) {
          callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: e instanceof Error ? e.message : 'Invalid status'
          });
          return;
        }
      }
      if (request.event_id) filter.eventId = request.event_id;

      const payments = await prisma.payment.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' }
      });

      const response = {
        payments: payments.map((p) => ({
          payment_id: p.id,
          status: p.status,
          amount: p.amount,
          currency: p.currency,
          qr_code_uri: p.qrCodeUri,
          event_id: p.eventId,
          created_at: p.createdAt.toISOString(),
          updated_at: p.updatedAt.toISOString()
        }))
      };

      callback(null, response);
    } catch (error) {
      console.error('gRPC getPlayerPayments error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async getEventPayments(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
    try {
      const request = call.request;
      
      if (!request.event_id) {
        callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Event ID is required'
        });
        return;
      }

      const filter: any = { eventId: request.event_id };
      if (request.status) {
        try {
          filter.status = validateStatusOrThrow(request.status);
        } catch (e) {
          callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: e instanceof Error ? e.message : 'Invalid status'
          });
          return;
        }
      }

      const payments = await prisma.payment.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' }
      });

      const response = {
        payments: payments.map((p) => ({
          player_id: p.playerId,
          amount: p.amount,
          status: p.status
        }))
      };

      callback(null, response);
    } catch (error) {
      console.error('gRPC getEventPayments error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

export function startGrpcServer() {
  const server = new grpc.Server();
  server.addService(paymentProto.PaymentService.service, grpcService);

  const grpcPort = process.env.GRPC_PORT || '50051';
  const bindAddress = `0.0.0.0:${grpcPort}`;

  server.bindAsync(bindAddress, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      Logger.error('Failed to start gRPC server', err);
      return;
    }
    Logger.server(`gRPC server running on port ${port}`);
    server.start();
  });

  return server;
}