import { Logger } from '../utils/logger';

export interface QRCodePaymentData {
  paymentReference: string;
  amount: number;
  currency: string;
  bankAccount?: string;
  promptPayId?: string;
  qrCodeData?: string;
}

export class PaymentService {
  constructor() {
    // Payment service for prompt-pay/QR code flow
  }

  /**
   * Create payment reference and QR code data for prompt-pay/bank transfer
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    paymentMethodId?: string;
    metadata?: Record<string, any>;
  }): Promise<QRCodePaymentData> {
    Logger.payment('Creating payment intent', {
      amount: params.amount,
      currency: params.currency,
      paymentMethodId: params.paymentMethodId
    });

    // Generate unique payment reference
    const paymentReference = this.generatePaymentReference();
    
    // Generate QR code data for prompt-pay or bank transfer
    const qrCodeData = this.generateQRCodeData({
      reference: paymentReference,
      amount: params.amount,
      currency: params.currency
    });

    const result = {
      paymentReference,
      amount: params.amount,
      currency: params.currency,
      bankAccount: process.env.COMPANY_BANK_ACCOUNT || 'xxx-x-xxxxx-x',
      promptPayId: process.env.PROMPT_PAY_ID || '0xx-xxx-xxxx',
      qrCodeData
    };

    Logger.success('Payment intent created successfully', {
      paymentReference,
      amount: params.amount,
      currency: params.currency
    });

    // Display QR code in console
    Logger.displayQRCode(qrCodeData, result);

    return result;
  }

  /**
   * Confirm a payment (manual confirmation for MVP)
   */
  async confirmPayment(
    paymentReference: string, 
    paymentMethodId?: string
  ): Promise<{ status: string; id: string; latest_charge?: string }> {
    Logger.payment('Confirming payment', {
      paymentReference,
      paymentMethodId
    });

    // For MVP: Return pending status, actual confirmation will be manual
    // In production, this could integrate with bank APIs to verify payment
    
    const result = {
      id: paymentReference,
      status: 'requires_confirmation', // Manual confirmation needed
      latest_charge: paymentReference
    };

    Logger.warning('Payment requires manual confirmation', {
      paymentReference,
      status: result.status
    });

    Logger.displayPaymentStatus(result.status, paymentReference);

    return result;
  }

  /**
   * Create a refund (manual process for MVP)
   */
  async createRefund(params: {
    chargeId: string;
    amount?: number;
    reason?: string;
  }): Promise<{ id: string; amount?: number; status: string }> {
    Logger.payment('Creating refund', {
      chargeId: params.chargeId,
      amount: params.amount,
      reason: params.reason
    });

    // Generate refund reference, actual refund will be manual
    const refundReference = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = {
      id: refundReference,
      amount: params.amount ? Math.round(params.amount * 100) : undefined,
      status: 'pending' // Manual refund process
    };

    Logger.warning('Refund created - manual processing required', {
      refundId: refundReference,
      originalChargeId: params.chargeId,
      amount: params.amount,
      reason: params.reason
    });

    Logger.displayPaymentStatus('refunded', refundReference);

    return result;
  }

  /**
   * Generate unique payment reference
   */
  private generatePaymentReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `PAY${timestamp}${random}`;
  }

  /**
   * Generate QR code data string for prompt-pay/bank transfer
   * This is the data that frontend will use to generate QR code
   */
  private generateQRCodeData(params: {
    reference: string;
    amount: number;
    currency: string;
  }): string {
    // Simple JSON string that frontend can use
    // In production, this could be proper prompt-pay QR format
    const qrData = {
      type: 'promptpay',
      paymentReference: params.reference,
      amount: params.amount,
      currency: params.currency,
      recipientId: process.env.PROMPT_PAY_ID || '0xx-xxx-xxxx',
      bankAccount: process.env.COMPANY_BANK_ACCOUNT || 'xxx-x-xxxxx-x'
    };

    // Return base64 encoded JSON for QR code generation on frontend
    return Buffer.from(JSON.stringify(qrData)).toString('base64');
  }

  /**
   * Manually confirm payment (for admin use)
   */
  async manualConfirmPayment(paymentReference: string): Promise<{ status: string; confirmedAt: Date }> {
    Logger.payment('Manually confirming payment', { paymentReference });

    const result = {
      status: 'succeeded',
      confirmedAt: new Date()
    };

    Logger.success('Payment manually confirmed', {
      paymentReference,
      confirmedAt: result.confirmedAt
    });

    Logger.displayPaymentStatus('completed', paymentReference);

    return result;
  }

  /**
   * Get payment details by reference
   */
  async getPaymentByReference(paymentReference: string): Promise<any> {
    Logger.info('Retrieving payment details', { paymentReference });

    // For MVP: This would typically check with bank API or manual records
    const result = {
      id: paymentReference,
      status: 'pending', // Default status until manually confirmed
      created: Date.now()
    };

    Logger.info('Payment details retrieved', result);

    return result;
  }
}