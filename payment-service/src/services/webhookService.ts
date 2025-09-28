import { PrismaClient, TransactionType } from '@prisma/client';
import { PAYMENT_STATUS, PaymentStatusValue } from '../constants/paymentStatus';
import { Logger } from '../utils/logger';
import { OmiseWebhookEvent, WebhookResponse } from '../types/payment';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const prisma = new PrismaClient();

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  paymentId?: string;
  updatedStatus?: PaymentStatusValue;
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
  if (payment.status === PAYMENT_STATUS.COMPLETED) {
      Logger.info('Payment already completed', { payment_id: payment.id });
      return {
        success: true,
        message: 'Payment already completed',
        paymentId: payment.id,
  updatedStatus: PAYMENT_STATUS.COMPLETED
      };
    }

    // Idempotency: if a COMPLETED transaction already exists for this charge, skip creating another
    const existingCompletedTx = await prisma.paymentTransaction.findFirst({
  where: { paymentId: payment.id, transactionId: chargeId, status: PAYMENT_STATUS.COMPLETED }
    });

    let updatedPayment;
    if (existingCompletedTx) {
      updatedPayment = payment;
    } else {
      updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PAYMENT_STATUS.COMPLETED,
          transactions: {
            create: {
              id: uuidv4(),
              type: 'charge',
              amount: payment.amount,
              status: PAYMENT_STATUS.COMPLETED,
              transactionId: chargeId,
              timestamp: new Date()
            }
          }
        }
      });
    }

    Logger.success('Payment marked as completed via webhook', {
      payment_id: updatedPayment.id,
      charge_id: chargeId,
      webhook_event_id: webhookEvent.id,
      amount: updatedPayment.amount,
      currency: updatedPayment.currency
    });

    // After marking a payment as completed, attempt to complete the parent event if applicable
    if (updatedPayment.eventId) {
      try {
        await this.maybeMarkEventCompleted(updatedPayment.eventId);
      } catch (err) {
        Logger.warning('Failed to maybe mark event as completed', {
          event_id: updatedPayment.eventId,
          error: err instanceof Error ? err.message : err
        });
      }
    }

    return {
      success: true,
      message: 'Payment completed successfully',
      paymentId: updatedPayment.id,
	updatedStatus: PAYMENT_STATUS.COMPLETED
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

    // Idempotency: avoid duplicate FAILED transaction
    const existingFailedTx = await prisma.paymentTransaction.findFirst({
  where: { paymentId: payment.id, transactionId: chargeId, status: PAYMENT_STATUS.FAILED }
    });

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
  status: PAYMENT_STATUS.FAILED,
        transactions: existingFailedTx ? undefined : {
          create: {
            id: uuidv4(),
            type: 'charge',
            amount: payment.amount,
            status: PAYMENT_STATUS.FAILED,
            transactionId: chargeId,
            timestamp: new Date()
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
  updatedStatus: PAYMENT_STATUS.FAILED
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

    // Only create a pending transaction if one doesn't already exist for this charge
    const existingPendingTx = await prisma.paymentTransaction.findFirst({
  where: { paymentId: payment.id, transactionId: chargeId, status: PAYMENT_STATUS.PENDING }
    });

    if (!existingPendingTx) {
      await prisma.paymentTransaction.create({
        data: {
          id: uuidv4(),
          paymentId: payment.id,
          type: 'charge',
          amount: payment.amount,
          status: PAYMENT_STATUS.PENDING,
          transactionId: chargeId,
          timestamp: new Date()
        }
      });
    }

    Logger.info('Payment pending status updated via webhook', {
      payment_id: payment.id,
      charge_id: chargeId,
      webhook_event_id: webhookEvent.id
    });

    return {
      success: true,
      message: 'Payment pending status updated',
      paymentId: payment.id,
  updatedStatus: PAYMENT_STATUS.PENDING
    };
  }

  /**
   * Handle charge.reversed event - payment was reversed/refunded
   */
  // Refund/reversal handling removed per simplified requirements

  /**
   * Find payment by Omise charge ID
   */
  private async findPaymentByChargeId(chargeId: string) {
    // New direct lookup using omiseChargeId (camelCase field mapped to snake_case column)
      const payment = await prisma.payment.findFirst({
        where: { omiseChargeId: chargeId }
    });
    return payment || null;
  }

  /**
   * Check if webhook event has already been processed (idempotency)
   */
  private async isWebhookAlreadyProcessed(webhookEventId: string): Promise<boolean> {
    // Consider event processed if a transaction with this charge (event id) already exists
    const existing = await prisma.paymentTransaction.findFirst({
      where: { transactionId: webhookEventId }
    });
    return !!existing;
  }

  /**
   * Check if all payments linked to an event are COMPLETED. If yes, call Event Service to PATCH status.
   * Idempotent: will only call if all are completed and we haven't attempted very recently.
   */
  private async maybeMarkEventCompleted(eventId: string): Promise<void> {
    try {
      // Fetch all payments for the event
      const payments = await prisma.payment.findMany({ where: { eventId } });
      if (!payments.length) {
        Logger.warning('No payments found for event when attempting completion', { event_id: eventId });
        return;
      }

      // If any payment not COMPLETED -> exit early
      const allCompleted = payments.every(p => p.status === PAYMENT_STATUS.COMPLETED);
      if (!allCompleted) {
        Logger.info('Not all payments completed for event yet', {
          event_id: eventId,
          total: payments.length,
          completed: payments.filter(p => p.status === PAYMENT_STATUS.COMPLETED).length
        });
        return;
      }

      const baseUrl = process.env.EVENT_SERVICE_URL?.replace(/\/$/, '');
      if (!baseUrl) {
        Logger.warning('EVENT_SERVICE_URL not configured; cannot PATCH event status');
        return;
      }

      const url = `${baseUrl}/api/events/${eventId}`;
      Logger.info('All payments completed; attempting to mark event completed', { event_id: eventId, url });

      try {
        const response = await axios.patch(url, { status: 'completed' }, { timeout: 5000 });
        Logger.success('Event status update PATCH sent to Event Service', {
          event_id: eventId,
          status: 'completed',
          http_status: response.status
        });
      } catch (httpErr: any) {
        Logger.error('Failed to PATCH event status to Event Service', {
          event_id: eventId,
          error: httpErr?.message,
          response_status: httpErr?.response?.status,
          response_data: httpErr?.response?.data
        });
      }
    } catch (err) {
      Logger.error('Error during maybeMarkEventCompleted', err);
    }
  }
}

export const webhookService = new WebhookService();