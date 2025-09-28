import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { prisma } from './config/paymentDatabase';
import { PaymentStatus, TransactionType } from './models/Payment';
import { omiseService } from './services/omiseService';
import { v4 as uuidv4 } from 'uuid';
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

// Convert PaymentStatus enum from proto to internal
function convertStatusFromProto(protoStatus: number): PaymentStatus {
  const statusMap = {
    0: PaymentStatus.PENDING,
    1: PaymentStatus.PROCESSING,
    2: PaymentStatus.COMPLETED,
    3: PaymentStatus.FAILED,
    4: PaymentStatus.CANCELLED,
  } as const;
  return statusMap[protoStatus as keyof typeof statusMap] || PaymentStatus.PENDING;
}

// Convert PaymentStatus enum to proto format
function convertStatusToProto(status: PaymentStatus): number {
  switch (status) {
    case PaymentStatus.PENDING: return 0;
    case PaymentStatus.PROCESSING: return 1;
    case PaymentStatus.COMPLETED: return 2;
    case PaymentStatus.FAILED: return 3;
    case PaymentStatus.CANCELLED: return 4;
    default: return 0;
  }
}

// gRPC service implementations
const grpcService = {
  async issueCharges(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
    try {
      const request = call.request;
      
      Logger.grpc('IssueCharges request received', {
        player_id: request.player_id,
        amount: request.amount,
        currency: request.currency,
        event_id: request.event_id,
        payment_method: request.payment_method
      });

      // Validate required fields
      if (!request.player_id || !request.amount || !request.event_id) {
        Logger.error('Invalid IssueCharges request - missing required fields', {
          player_id: request.player_id,
          amount: request.amount,
          event_id: request.event_id
        });
        callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Missing required fields: player_id, event_id and amount are required'
        });
        return;
      }

      // Convert amount to satang (smallest unit for THB)
      const amountInSatang = Math.round(request.amount * 100);
      const currency = (request.currency || 'THB').toUpperCase();

      Logger.info('Creating Omise source', {
        amount: amountInSatang,
        currency: currency
      });

      // Step 1: Create Omise source for PromptPay
      const omiseSource = await omiseService.createSource(amountInSatang, currency);
      
      Logger.success('Omise source created', {
        sourceId: omiseSource.id,
        type: omiseSource.type,
        amount: omiseSource.amount
      });

      // Step 2: Create Omise charge using the source
      const omiseCharge = await omiseService.createCharge(
        amountInSatang, 
        currency, 
        omiseSource.id
      );

      Logger.success('Omise charge created', {
        chargeId: omiseCharge.id,
        status: omiseCharge.status,
        amount: omiseCharge.amount
      });

      // Step 3: Display QR code in console
      if (omiseCharge.source?.scannable_code?.image?.download_uri) {
        await omiseService.displayQRCode(omiseCharge.source.scannable_code.image.download_uri);
      }

      // Step 4: Create payment record in database
      const paymentId = uuidv4();
      const payment = await prisma.payment.create({
        data: {
          id: paymentId,
          eventId: request.event_id,
          playerId: request.player_id,
          amount: request.amount,
          currency: currency.toLowerCase(),
          status: PaymentStatus.PENDING,
          description: request.description || null,
          paymentMethod: (request.payment_method || 'PROMPT_PAY'),
          qrCodeUri: omiseCharge.source?.scannable_code?.image?.download_uri || null,
          omiseChargeId: omiseCharge.id,
          omiseSourceId: omiseSource.id,
          transactions: {
            create: {
              id: uuidv4(),
              type: TransactionType.charge,
              amount: request.amount,
              status: PaymentStatus.PENDING,
              transactionId: omiseCharge.id,
              timestamp: new Date()
            }
          }
        },
        include: { transactions: true }
      });

      const response = {
        id: paymentId,
        status: convertStatusToProto(payment.status),
        amount: payment.amount,
        currency: payment.currency,
        qr_code_uri: payment.qrCodeUri || '',
        created_at: payment.createdAt.getTime(),
        updated_at: payment.updatedAt.getTime()
      };

      Logger.success('IssueCharges completed successfully with Omise', {
        paymentId,
        omiseChargeId: omiseCharge.id,
        omiseSourceId: omiseSource.id,
        amount: payment.amount,
        currency: payment.currency,
        qrCodeUri: omiseCharge.source?.scannable_code?.image?.download_uri
      });

      callback(null, response);
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
        status: convertStatusToProto(payment.status),
        amount: payment.amount,
        currency: payment.currency,
        event_id: payment.eventId,
        player_id: payment.playerId,
        created_at: payment.createdAt.getTime(),
        updated_at: payment.updatedAt.getTime(),
        transactions: payment.transactions.map((tx) => ({
          id: tx.id,
          type: 0, // only 'charge'
          amount: tx.amount,
          status: convertStatusToProto(tx.status),
          transaction_id: tx.transactionId,
          timestamp: tx.timestamp.getTime()
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
      if (request.status) filter.status = convertStatusFromProto(parseInt(request.status));
  if (request.event_id) filter.eventId = request.event_id;

      const payments = await prisma.payment.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' }
      });

      const response = {
        payments: payments.map((p) => ({
          payment_id: p.id,
          status: convertStatusToProto(p.status),
          amount: p.amount,
          currency: p.currency,
          event_id: p.eventId,
          created_at: p.createdAt.getTime(),
          updated_at: p.updatedAt.getTime()
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
      if (request.status) filter.status = convertStatusFromProto(parseInt(request.status));

      const payments = await prisma.payment.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' }
      });

      const response = {
        payments: payments.map((p) => ({
          player_id: p.playerId,
          amount: p.amount,
          status: convertStatusToProto(p.status)
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