import { Router, Request, Response } from 'express';
import { PaymentServiceClient } from '../clients/paymentClient';
import { Logger } from '../utils/logger';

const router = Router();
const paymentClient = new PaymentServiceClient();

// Settlement endpoints that call the gRPC Payment Service

/**
 * POST /api/settlements/charges
 * Issue charges for a settlement
 */
router.post('/charges', async (req: Request, res: Response) => {
  try {
    Logger.info('Settlement charge request received', {
      body: req.body,
      timestamp: new Date().toISOString()
    });

    const {
      event_id,
      player_id,
      amount,
      currency = 'THB',
      description,
      payment_method_id,
      metadata
    } = req.body;

    // Validate required fields
    if (!player_id || !amount) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'Missing required fields: player_id and amount are required',
        details: { required_fields: ['player_id', 'amount'] }
      });
    }

    // Call gRPC Payment Service
    Logger.grpc('Calling Payment Service - IssueCharges', { player_id, amount, currency });

    const paymentResponse = await paymentClient.issueCharges({
      event_id,
      player_id,
      amount,
      currency,
      description: description || `Settlement charge for player ${player_id}`,
      payment_method_id,
      metadata
    });

    Logger.success('Payment Service response received', {
      payment_id: paymentResponse.id,
      status: paymentResponse.status
    });

    // Return RESTful response
    res.status(201).json({
      success: true,
      data: {
        settlement_id: paymentResponse.id,
        payment_id: paymentResponse.id,
        status: paymentResponse.status,
        amount: paymentResponse.amount,
        currency: paymentResponse.currency,
        client_secret: paymentResponse.client_secret,
        payment_intent_id: paymentResponse.payment_intent_id,
        created_at: paymentResponse.created_at,
        updated_at: paymentResponse.updated_at
      },
      message: 'Settlement charge issued successfully'
    });

  } catch (error) {
    Logger.error('Settlement charge failed', error);

    res.status(500).json({
      success: false,
      code: 'SETTLEMENT_CHARGE_FAILED',
      message: 'Failed to issue settlement charge',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
});

/**
 * PUT /api/settlements/:settlement_id/confirm
 * Confirm a settlement payment
 */
router.put('/:settlement_id/confirm', async (req: Request, res: Response) => {
  try {
    const { settlement_id } = req.params;
    const { payment_method_id, payment_intent_id } = req.body;

    Logger.info('Settlement confirmation request received', {
      settlement_id,
      payment_method_id,
      payment_intent_id
    });

    // Call gRPC Payment Service
    Logger.grpc('Calling Payment Service - ConfirmPayment', { payment_id: settlement_id });

    const paymentResponse = await paymentClient.confirmPayment({
      payment_id: settlement_id,
      payment_method_id,
      payment_intent_id
    });

    Logger.success('Payment confirmation successful', {
      payment_id: paymentResponse.id,
      status: paymentResponse.status
    });

    res.status(200).json({
      success: true,
      data: {
        settlement_id: paymentResponse.id,
        payment_id: paymentResponse.id,
        status: paymentResponse.status,
        amount: paymentResponse.amount,
        currency: paymentResponse.currency,
        updated_at: paymentResponse.updated_at
      },
      message: 'Settlement payment confirmed successfully'
    });

  } catch (error) {
    Logger.error('Settlement confirmation failed', error);

    res.status(500).json({
      success: false,
      code: 'SETTLEMENT_CONFIRMATION_FAILED',
      message: 'Failed to confirm settlement payment',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
});

/**
 * POST /api/settlements/:settlement_id/refund
 * Refund a settlement payment
 */
router.post('/:settlement_id/refund', async (req: Request, res: Response) => {
  try {
    const { settlement_id } = req.params;
    const { amount, reason } = req.body;

    Logger.info('Settlement refund request received', {
      settlement_id,
      amount,
      reason
    });

    // Call gRPC Payment Service
    Logger.grpc('Calling Payment Service - RefundPayment', { payment_id: settlement_id });

    const paymentResponse = await paymentClient.refundPayment({
      payment_id: settlement_id,
      amount,
      reason: reason || 'Settlement refund'
    });

    Logger.success('Payment refund successful', {
      payment_id: paymentResponse.id,
      status: paymentResponse.status
    });

    res.status(200).json({
      success: true,
      data: {
        settlement_id: paymentResponse.id,
        payment_id: paymentResponse.id,
        status: paymentResponse.status,
        amount: paymentResponse.amount,
        currency: paymentResponse.currency,
        updated_at: paymentResponse.updated_at
      },
      message: 'Settlement refund processed successfully'
    });

  } catch (error) {
    Logger.error('Settlement refund failed', error);

    res.status(500).json({
      success: false,
      code: 'SETTLEMENT_REFUND_FAILED',
      message: 'Failed to process settlement refund',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
});

/**
 * GET /api/settlements/:settlement_id/status
 * Get settlement status
 */
router.get('/:settlement_id/status', async (req: Request, res: Response) => {
  try {
    const { settlement_id } = req.params;

    Logger.info('Settlement status request received', { settlement_id });

    // Call gRPC Payment Service
    Logger.grpc('Calling Payment Service - GetPaymentStatus', { payment_id: settlement_id });

    const statusResponse = await paymentClient.getPaymentStatus({
      payment_id: settlement_id
    });

    Logger.success('Payment status retrieved', {
      payment_id: statusResponse.payment_id,
      status: statusResponse.status
    });

    res.status(200).json({
      success: true,
      data: {
        settlement_id: statusResponse.payment_id,
        payment_id: statusResponse.payment_id,
        status: statusResponse.status,
        amount: statusResponse.amount,
        currency: statusResponse.currency,
        refunded_amount: statusResponse.refunded_amount,
        event_id: statusResponse.event_id,
        player_id: statusResponse.player_id,
        created_at: statusResponse.created_at,
        updated_at: statusResponse.updated_at,
        last_status_change: statusResponse.last_status_change,
        transactions: statusResponse.transactions
      },
      message: 'Settlement status retrieved successfully'
    });

  } catch (error) {
    Logger.error('Settlement status retrieval failed', error);

    res.status(500).json({
      success: false,
      code: 'SETTLEMENT_STATUS_FAILED',
      message: 'Failed to retrieve settlement status',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
});

/**
 * GET /api/settlements/player/:player_id
 * Get settlements for a specific player
 */
router.get('/player/:player_id', async (req: Request, res: Response) => {
  try {
    const { player_id } = req.params;
    const { status, event_id } = req.query;

    Logger.info('Player settlements request received', {
      player_id,
      status,
      event_id
    });

    // Call gRPC Payment Service
    Logger.grpc('Calling Payment Service - GetPlayerPayments', { player_id });

    const paymentsResponse = await paymentClient.getPlayerPayments({
      player_id,
      status: status as string,
      event_id: event_id as string
    });

    Logger.success('Player payments retrieved', {
      player_id,
      payments_count: paymentsResponse.payments?.length || 0
    });

    res.status(200).json({
      success: true,
      data: {
        player_id,
        settlements: paymentsResponse.payments?.map((payment: any) => ({
          settlement_id: payment.payment_id,
          payment_id: payment.payment_id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          refunded_amount: payment.refunded_amount,
          event_id: payment.event_id,
          created_at: payment.created_at,
          updated_at: payment.updated_at
        })) || []
      },
      message: 'Player settlements retrieved successfully'
    });

  } catch (error) {
    Logger.error('Player settlements retrieval failed', error);

    res.status(500).json({
      success: false,
      code: 'PLAYER_SETTLEMENTS_FAILED',
      message: 'Failed to retrieve player settlements',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
});

export default router;