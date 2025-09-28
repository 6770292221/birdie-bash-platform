import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { prisma } from './config/paymentDatabase';
import { IPayment, PaymentStatus, PaymentType, TransactionType } from './models/Payment';
import { omiseService } from './services/omiseService';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './utils/logger';

// Load the protobuf
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
    4: PaymentStatus.REFUNDED,
    5: PaymentStatus.PARTIALLY_REFUNDED,
    6: PaymentStatus.CANCELLED,
  };
  return statusMap[protoStatus as keyof typeof statusMap] || PaymentStatus.PENDING;
}

// Convert PaymentStatus enum to proto format
function convertStatusToProto(status: PaymentStatus): number {
  const statusMap = {
    [PaymentStatus.PENDING]: 0,
    [PaymentStatus.PROCESSING]: 1,
    [PaymentStatus.COMPLETED]: 2,
    [PaymentStatus.FAILED]: 3,
    [PaymentStatus.REFUNDED]: 4,
    [PaymentStatus.PARTIALLY_REFUNDED]: 5,
    [PaymentStatus.CANCELLED]: 6,
  };
  return statusMap[status] || 0;
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
        event_id: request.event_id
      });

      // Validate required fields
      if (!request.player_id || !request.amount) {
        Logger.error('Invalid IssueCharges request - missing required fields', {
          player_id: request.player_id,
          amount: request.amount
        });
        callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Missing required fields: player_id and amount are required'
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
          eventId: request.event_id || null,
          playerId: request.player_id,
          amount: request.amount, // Store original amount (not in satang)
          currency: currency.toLowerCase(),
          status: PaymentStatus.PENDING,
          paymentType: request.event_id ? PaymentType.EVENT_REGISTRATION : PaymentType.MEMBERSHIP_FEE,
          description: request.description || null,
          metadata: {
            ...request.metadata,
            omiseSourceId: omiseSource.id,
            omiseChargeId: omiseCharge.id,
            qrCodeUri: omiseCharge.source?.scannable_code?.image?.download_uri
          },
          refundedAmount: 0,
          lastStatusChange: new Date(),
          paymentIntentId: omiseCharge.id, // Store Omise charge ID
          chargeId: omiseCharge.id,
          transactions: {
            create: {
              id: uuidv4(),
              type: TransactionType.charge,
              amount: request.amount,
              status: PaymentStatus.PENDING,
              transactionId: omiseCharge.id,
              timestamp: new Date(),
              metadata: {
                omiseStatus: omiseCharge.status,
                sourceType: omiseSource.type
              }
            }
          }
        },
        include: {
          transactions: true
        }
      });

      const response = {
        id: paymentId,
        status: convertStatusToProto(payment.status),
        amount: payment.amount,
        currency: payment.currency,
        payment_intent_id: omiseCharge.id,
        client_secret: omiseCharge.source?.scannable_code?.image?.download_uri || '', // QR code URL
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
        refunded_amount: payment.refundedAmount,
        event_id: payment.eventId,
        player_id: payment.playerId,
        created_at: payment.createdAt.getTime(),
        updated_at: payment.updatedAt.getTime(),
        last_status_change: payment.lastStatusChange.getTime(),
        transactions: payment.transactions.map((tx: any) => ({
          id: tx.id,
          type: tx.type === 'charge' ? 0 : tx.type === 'refund' ? 1 : 2,
          amount: tx.amount,
          status: convertStatusToProto(tx.status),
          transaction_id: tx.transactionId,
          timestamp: tx.timestamp.getTime(),
          metadata: tx.metadata || {}
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
        payments: payments.map((payment: any) => ({
          payment_id: payment.id,
          status: convertStatusToProto(payment.status),
          amount: payment.amount,
          currency: payment.currency,
          refunded_amount: payment.refundedAmount,
          event_id: payment.eventId,
          created_at: payment.createdAt.getTime(),
          updated_at: payment.updatedAt.getTime()
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
        payments: payments.map((payment: any) => ({
          player_id: payment.playerId,
          amount: payment.amount,
          status: convertStatusToProto(payment.status)
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
  // Display banner
  Logger.displayBanner();

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