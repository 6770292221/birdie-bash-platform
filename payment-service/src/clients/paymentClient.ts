// ------------------------------------------------------------------------------
// ⚠️ WARNING: THIS IS ONLY AN EXAMPLE OF gRPC CLIENT USAGE ⚠️
// WILL BE USED IN THE FUTURE FOR MICROSERVICES COMMUNICATION (SETTLEMENT-SERVICE)
// ------------------------------------------------------------------------------

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// gRPC client for communicating with Payment Service
export class PaymentServiceClient {
  private client: any;

  constructor(serverAddress: string = 'localhost:50051') {
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
    
    // Create client
    this.client = new paymentProto.PaymentService(
      serverAddress,
      grpc.credentials.createInsecure()
    );
  }

  /**
   * Issue charges for a payment
   */
  async issueCharges(request: {
    event_id?: string;
    player_id: string;
    amount: number;
    currency?: string;
    description?: string;
    payment_method_id?: string;
    metadata?: Record<string, string>;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.IssueCharges(request, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Confirm a payment
   */
  async confirmPayment(request: {
    payment_id: string;
    payment_method_id?: string;
    payment_intent_id?: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.ConfirmPayment(request, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Refund a payment
   */
  async refundPayment(request: {
    payment_id: string;
    amount?: number;
    reason?: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.RefundPayment(request, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(request: {
    payment_id: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetPaymentStatus(request, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Get player payments
   */
  async getPlayerPayments(request: {
    player_id: string;
    status?: string;
    event_id?: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.GetPlayerPayments(request, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Close the client connection
   */
  close(): void {
    this.client.close();
  }
}

// Example usage:
/*
const paymentClient = new PaymentServiceClient();

// Issue charges
const payment = await paymentClient.issueCharges({
  player_id: 'player_123',
  amount: 100.0,
  currency: 'THB',
  description: 'Event registration'
});

console.log('Payment created:', payment);

// Get QR code data from client_secret
const qrData = JSON.parse(Buffer.from(payment.client_secret, 'base64').toString());
console.log('QR Code Data:', qrData);

paymentClient.close();
*/