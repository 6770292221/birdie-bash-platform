import { PrismaClient, PaymentStatus, TransactionType } from '@prisma/client';
import { Logger } from '../utils/logger';
import { OmiseWebhookEvent, WebhookResponse } from '../types/payment';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  paymentId?: string;
  updatedStatus?: PaymentStatus;
  error?: string;
}

export class WebhookService {
  /**
   * Express handler wrapper to process incoming Omise webhook HTTP requests.
   * Keeps HTTP / transport concerns out of the server bootstrap file.
   */
  async handleOmiseWebhookHttp(req: Request, res: Response): Promise<void> {
    try {
      const webhookEvent: OmiseWebhookEvent = req.body;

      Logger.success('Omise webhook received', {
        event_id: webhookEvent.id,
        event_type: webhookEvent.key,
        livemode: webhookEvent.livemode,
        data_object: webhookEvent.data?.object,
        data_id: webhookEvent.data?.id,
        amount: webhookEvent.data?.amount,
        currency: webhookEvent.data?.currency,
        status: webhookEvent.data?.status,
        created_at: webhookEvent.created_at
      });

      const result = await this.processWebhookEvent(webhookEvent);

      if (result.success) {
        const response: WebhookResponse = {
          received: true,
          timestamp: new Date().toISOString(),
          event_type: webhookEvent.key || 'unknown',
          event_id: webhookEvent.id || 'unknown',
          message: result.message
        };

        Logger.success('Webhook processed successfully', {
          event_id: webhookEvent.id,
          payment_id: result.paymentId,
          updated_status: result.updatedStatus,
          message: result.message
        });

        res.status(200).json(response);
      } else {
        Logger.error('Webhook processing failed', {
          event_id: webhookEvent.id,
          error: result.error,
          message: result.message
        });

        const errorResponse: WebhookResponse = {
          received: false,
          timestamp: new Date().toISOString(),
          event_type: webhookEvent.key || 'unknown',
          event_id: webhookEvent.id || 'unknown',
          message: result.message || 'Failed to process webhook'
        };

        res.status(400).json(errorResponse);
      }
    } catch (error) {
      Logger.error('Error processing Omise webhook', error);

      const errorResponse: WebhookResponse = {
        received: false,
        timestamp: new Date().toISOString(),
        event_type: 'error',
        event_id: 'unknown',
        message: 'Error processing webhook'
      };

      res.status(500).json(errorResponse);
    }
  }

  /**
   * Process incoming Omise webhook events
   */
  async processWebhookEvent(webhookEvent: OmiseWebhookEvent): Promise<WebhookProcessingResult> {
    try {
      // Validate webhook event structure
      if (!webhookEvent.id || !webhookEvent.key) {
        throw new Error('Invalid webhook event: missing id or key');
      }

      Logger.info('Processing webhook event', {
        event_id: webhookEvent.id,
        event_type: webhookEvent.key,
        charge_id: webhookEvent.data?.id,
        status: webhookEvent.data?.status
      });

      // Check for idempotency - prevent processing the same event twice
      const alreadyProcessed = await this.isWebhookAlreadyProcessed(webhookEvent.id);
      if (alreadyProcessed) {
        Logger.info('Webhook event already processed (idempotency check)', {
          event_id: webhookEvent.id
        });
        return {
          success: true,
          message: 'Webhook event already processed'
        };
      }

      // Handle different webhook event types
      switch (webhookEvent.key) {
        case 'charge.complete':
          return await this.handleChargeComplete(webhookEvent);
        case 'charge.failed':
          return await this.handleChargeFailed(webhookEvent);
        case 'charge.pending':
          return await this.handleChargePending(webhookEvent);
        case 'charge.reversed':
          return await this.handleChargeReversed(webhookEvent);
        default:
          Logger.warning('Unhandled webhook event type', { event_type: webhookEvent.key });
          return {
            success: true,
            message: `Webhook event ${webhookEvent.key} received but not processed`
          };
      }
    } catch (error) {
      Logger.error('Error processing webhook event', error);
      return {
        success: false,
        message: 'Failed to process webhook event',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle charge.complete event - payment was successful
   */
  private async handleChargeComplete(webhookEvent: OmiseWebhookEvent): Promise<WebhookProcessingResult> {
    const chargeId = webhookEvent.data?.id;
    const omiseStatus = webhookEvent.data?.status;

    if (!chargeId) {
      throw new Error('Charge ID not found in webhook data');
    }

    // Find payment by charge ID
    const payment = await this.findPaymentByChargeId(chargeId);
    if (!payment) {
      Logger.warning('Payment not found for charge ID', { charge_id: chargeId });
      return {
        success: false,
        message: `Payment not found for charge ID: ${chargeId}`
      };
    }

    // Only update if payment is not already completed
    if (payment.status === 'COMPLETED') {
      Logger.info('Payment already completed', { payment_id: payment.id });
      return {
        success: true,
        message: 'Payment already completed',
        paymentId: payment.id,
        updatedStatus: 'COMPLETED' as PaymentStatus
      };
    }

    // Update payment status to completed
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        lastStatusChange: new Date(),
        transactions: {
          create: {
            id: uuidv4(),
            type: 'charge',
            amount: payment.amount,
            status: 'COMPLETED',
            transactionId: chargeId,
            timestamp: new Date(),
            metadata: {
              webhookEventId: webhookEvent.id,
              webhookEventType: webhookEvent.key,
              omiseStatus,
              omiseData: webhookEvent.data,
              paidAt: webhookEvent.data?.paid_at,
              authorizedAt: webhookEvent.data?.authorized_at,
              net: webhookEvent.data?.net,
              fee: webhookEvent.data?.fee,
              transaction: webhookEvent.data?.transaction
            }
          }
        }
      },
      include: {
        transactions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    Logger.success('Payment marked as completed via webhook', {
      payment_id: updatedPayment.id,
      charge_id: chargeId,
      webhook_event_id: webhookEvent.id,
      amount: updatedPayment.amount,
      currency: updatedPayment.currency
    });

    return {
      success: true,
      message: 'Payment completed successfully',
      paymentId: updatedPayment.id,
      updatedStatus: 'COMPLETED' as PaymentStatus
    };
  }

  /**
   * Handle charge.failed event - payment failed
   */
  private async handleChargeFailed(webhookEvent: OmiseWebhookEvent): Promise<WebhookProcessingResult> {
    const chargeId = webhookEvent.data?.id;
    const omiseStatus = webhookEvent.data?.status;
    const failureCode = webhookEvent.data?.failure_code;
    const failureMessage = webhookEvent.data?.failure_message;

    if (!chargeId) {
      throw new Error('Charge ID not found in webhook data');
    }

    const payment = await this.findPaymentByChargeId(chargeId);
    if (!payment) {
      Logger.warning('Payment not found for charge ID', { charge_id: chargeId });
      return {
        success: false,
        message: `Payment not found for charge ID: ${chargeId}`
      };
    }

    // Update payment status to failed
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        lastStatusChange: new Date(),
        transactions: {
          create: {
            id: uuidv4(),
            type: 'charge',
            amount: payment.amount,
            status: 'FAILED',
            transactionId: chargeId,
            timestamp: new Date(),
            metadata: {
              webhookEventId: webhookEvent.id,
              webhookEventType: webhookEvent.key,
              omiseStatus,
              failureCode,
              failureMessage,
              omiseData: webhookEvent.data
            }
          }
        }
      }
    });

    Logger.error('Payment marked as failed via webhook', {
      payment_id: updatedPayment.id,
      charge_id: chargeId,
      webhook_event_id: webhookEvent.id,
      failure_code: failureCode,
      failure_message: failureMessage
    });

    return {
      success: true,
      message: 'Payment marked as failed',
      paymentId: updatedPayment.id,
      updatedStatus: 'FAILED' as PaymentStatus
    };
  }

  /**
   * Handle charge.pending event - payment is still pending
   */
  private async handleChargePending(webhookEvent: OmiseWebhookEvent): Promise<WebhookProcessingResult> {
    const chargeId = webhookEvent.data?.id;
    const omiseStatus = webhookEvent.data?.status;

    if (!chargeId) {
      throw new Error('Charge ID not found in webhook data');
    }

    const payment = await this.findPaymentByChargeId(chargeId);
    if (!payment) {
      Logger.warning('Payment not found for charge ID', { charge_id: chargeId });
      return {
        success: false,
        message: `Payment not found for charge ID: ${chargeId}`
      };
    }

    // Create transaction record for pending status update
    await prisma.paymentTransaction.create({
      data: {
        id: uuidv4(),
        paymentId: payment.id,
        type: 'charge',
        amount: payment.amount,
        status: 'PENDING',
        transactionId: chargeId,
        timestamp: new Date(),
        metadata: {
          webhookEventId: webhookEvent.id,
          webhookEventType: webhookEvent.key,
          omiseStatus,
          omiseData: webhookEvent.data
        }
      }
    });

    Logger.info('Payment pending status updated via webhook', {
      payment_id: payment.id,
      charge_id: chargeId,
      webhook_event_id: webhookEvent.id
    });

    return {
      success: true,
      message: 'Payment pending status updated',
      paymentId: payment.id,
      updatedStatus: 'PENDING' as PaymentStatus
    };
  }

  /**
   * Handle charge.reversed event - payment was reversed/refunded
   */
  private async handleChargeReversed(webhookEvent: OmiseWebhookEvent): Promise<WebhookProcessingResult> {
    const chargeId = webhookEvent.data?.id;
    const omiseStatus = webhookEvent.data?.status;
    const refundedAmount = webhookEvent.data?.refunded_amount || 0;

    if (!chargeId) {
      throw new Error('Charge ID not found in webhook data');
    }

    const payment = await this.findPaymentByChargeId(chargeId);
    if (!payment) {
      Logger.warning('Payment not found for charge ID', { charge_id: chargeId });
      return {
        success: false,
        message: `Payment not found for charge ID: ${chargeId}`
      };
    }

    // Determine if it's a full or partial refund
    const isPartialRefund = refundedAmount > 0 && refundedAmount < payment.amount;
    const newStatus = isPartialRefund ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        refundedAmount: refundedAmount,
        lastStatusChange: new Date(),
        transactions: {
          create: {
            id: uuidv4(),
            type: 'refund',
            amount: refundedAmount,
            status: newStatus,
            transactionId: chargeId,
            timestamp: new Date(),
            metadata: {
              webhookEventId: webhookEvent.id,
              webhookEventType: webhookEvent.key,
              omiseStatus,
              refundedAmount,
              totalAmount: payment.amount,
              isPartialRefund,
              omiseData: webhookEvent.data
            }
          }
        }
      }
    });

    Logger.warning('Payment refunded via webhook', {
      payment_id: updatedPayment.id,
      charge_id: chargeId,
      webhook_event_id: webhookEvent.id,
      refunded_amount: refundedAmount,
      total_amount: payment.amount,
      is_partial: isPartialRefund
    });

    return {
      success: true,
      message: `Payment ${isPartialRefund ? 'partially ' : ''}refunded`,
      paymentId: updatedPayment.id,
      updatedStatus: newStatus as PaymentStatus
    };
  }

  /**
   * Find payment by Omise charge ID
   */
  private async findPaymentByChargeId(chargeId: string) {
    // Try to find by chargeId first
    let payment = await prisma.payment.findFirst({
      where: { chargeId }
    });

    // If not found, try to find by metadata containing the charge ID
    if (!payment) {
      payment = await prisma.payment.findFirst({
        where: {
          OR: [
            {
              metadata: {
                string_contains: chargeId
              }
            },
            {
              paymentIntentId: chargeId
            }
          ]
        }
      });
    }

    return payment;
  }

  /**
   * Check if webhook event has already been processed (idempotency)
   */
  private async isWebhookAlreadyProcessed(webhookEventId: string): Promise<boolean> {
    const existingTransaction = await prisma.paymentTransaction.findFirst({
      where: {
        metadata: {
          string_contains: webhookEventId
        }
      }
    });

    return !!existingTransaction;
  }
}

export const webhookService = new WebhookService();