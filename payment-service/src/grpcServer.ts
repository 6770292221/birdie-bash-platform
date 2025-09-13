import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { Payment } from './models/Payment';
import { PaymentService } from './services/paymentService';
import { PaymentStatus, PaymentType } from './types/payment';
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
const paymentService = new PaymentService();

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
      }      // Create payment record
      const paymentId = uuidv4();
      const payment = new Payment({
        id: paymentId,
        eventId: request.event_id,
        playerId: request.player_id,
        amount: request.amount,
        currency: request.currency || 'thb', // Default to Thai Baht for prompt-pay
        status: PaymentStatus.PENDING,
        paymentType: request.event_id ? PaymentType.EVENT_REGISTRATION : PaymentType.MEMBERSHIP_FEE,
        description: request.description,
        metadata: request.metadata,
        transactions: [],
        refundedAmount: 0,
        lastStatusChange: new Date()
      });

      await payment.save();

      // Create payment intent (QR code data for prompt-pay)
      const paymentData = await paymentService.createPaymentIntent({
        amount: request.amount,
        currency: request.currency || 'thb',
        paymentMethodId: request.payment_method_id,
        metadata: {
          paymentId,
          playerId: request.player_id,
          eventId: request.event_id
        }
      });

      // Update payment with payment reference and QR data
      payment.paymentIntentId = paymentData.paymentReference; // Store payment reference
      payment.metadata = {
        ...payment.metadata,
        qrCodeData: paymentData.qrCodeData,
        bankAccount: paymentData.bankAccount,
        promptPayId: paymentData.promptPayId
      };
      await payment.save();

      const response = {
        id: paymentId,
        status: convertStatusToProto(payment.status),
        amount: payment.amount,
        currency: payment.currency,
        payment_intent_id: paymentData.paymentReference,
        client_secret: paymentData.qrCodeData, // QR code data for frontend
        created_at: payment.createdAt.getTime(),
        updated_at: payment.updatedAt.getTime()
      };

      Logger.success('IssueCharges completed successfully', {
        paymentId,
        paymentReference: paymentData.paymentReference,
        amount: payment.amount,
        currency: payment.currency
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

  //TODO: Verify & Test this function
  async confirmPayment(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
    try {
      const request = call.request;
      
      Logger.grpc('ConfirmPayment request received', {
        payment_id: request.payment_id,
        payment_method_id: request.payment_method_id
      });
      
      if (!request.payment_id) {
        Logger.error('Invalid ConfirmPayment request - missing payment_id');
        callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Payment ID is required'
        });
        return;
      }

      const payment = await Payment.findOne({ id: request.payment_id });
      if (!payment) {
        Logger.error('Payment not found', { payment_id: request.payment_id });
        callback({
          code: grpc.status.NOT_FOUND,
          message: 'Payment not found'
        });
        return;
      }

      // Confirm payment (manual confirmation process)
      const confirmedPayment = await paymentService.confirmPayment(
        payment.paymentIntentId!,
        request.payment_method_id
      );

      // Update payment status - for MVP, payments require manual confirmation
      payment.status = confirmedPayment.status === 'succeeded' 
        ? PaymentStatus.COMPLETED 
        : confirmedPayment.status === 'requires_confirmation'
        ? PaymentStatus.PENDING
        : PaymentStatus.FAILED;
      payment.lastStatusChange = new Date();
      
      if (confirmedPayment.latest_charge) {
        payment.chargeId = confirmedPayment.latest_charge; // Store payment reference
      }

      // Add transaction record
      payment.transactions.push({
        id: uuidv4(),
        type: 'charge',
        amount: payment.amount,
        status: payment.status,
        transactionId: confirmedPayment.id,
        timestamp: new Date(),
        metadata: { 
          confirmationMethod: 'manual',
          originalStatus: confirmedPayment.status 
        }
      });

      await payment.save();

      const response = {
        id: payment.id,
        status: convertStatusToProto(payment.status),
        amount: payment.amount,
        currency: payment.currency,
        payment_intent_id: payment.paymentIntentId,
        created_at: payment.createdAt.getTime(),
        updated_at: payment.updatedAt.getTime()
      };

      Logger.success('ConfirmPayment completed', {
        payment_id: payment.id,
        status: payment.status,
        confirmation_status: confirmedPayment.status
      });

      callback(null, response);
    } catch (error) {
      Logger.error('gRPC confirmPayment error', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  //TODO: Verify & Test this function
  async refundPayment(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
    try {
      const request = call.request;
      
      if (!request.payment_id) {
        callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Payment ID is required'
        });
        return;
      }

      const payment = await Payment.findOne({ id: request.payment_id });
      if (!payment) {
        callback({
          code: grpc.status.NOT_FOUND,
          message: 'Payment not found'
        });
        return;
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        callback({
          code: grpc.status.FAILED_PRECONDITION,
          message: 'Can only refund completed payments'
        });
        return;
      }

      const refundAmount = request.amount || (payment.amount - payment.refundedAmount);
      
      if (refundAmount <= 0 || (payment.refundedAmount + refundAmount) > payment.amount) {
        callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Invalid refund amount'
        });
        return;
      }

      // Process refund (now manual refund process)
      const refund = await paymentService.createRefund({
        chargeId: payment.chargeId!,
        amount: refundAmount,
        reason: request.reason
      });

      // Update payment record
      payment.refundedAmount += refundAmount;
      payment.status = payment.refundedAmount >= payment.amount 
        ? PaymentStatus.REFUNDED 
        : PaymentStatus.PARTIALLY_REFUNDED;
      payment.lastStatusChange = new Date();

      // Add refund transaction record
      payment.transactions.push({
        id: uuidv4(),
        type: 'refund',
        amount: refundAmount,
        status: PaymentStatus.PENDING, // Refunds are manual process
        transactionId: refund.id,
        timestamp: new Date(),
        metadata: { 
          reason: request.reason,
          refundMethod: 'manual',
          refundReference: refund.id
        }
      });

      await payment.save();

      const response = {
        id: payment.id,
        status: convertStatusToProto(payment.status),
        amount: refundAmount,
        currency: payment.currency,
        created_at: payment.createdAt.getTime(),
        updated_at: payment.updatedAt.getTime()
      };

      callback(null, response);
    } catch (error) {
      console.error('gRPC refundPayment error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  //TODO: Verify & Test this function
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

      const payment = await Payment.findOne({ id: request.payment_id });
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
        transactions: payment.transactions.map(tx => ({
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

  //TODO: Verify & Test this function
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

      const payments = await Payment.find(filter).sort({ createdAt: -1 });

      const response = {
        payments: payments.map(payment => ({
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
    Logger.server(`gRPC server running on port ${port}`, {
      port,
      bindAddress,
      services: ['PaymentService']
    });
    server.start();
  });

  return server;
}