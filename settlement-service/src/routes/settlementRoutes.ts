import { Router, Request, Response } from 'express';
import { PaymentServiceClient } from '../clients/paymentClient';
import { Logger } from '../utils/logger';
import { SettlementCalculator } from '../services/settlementCalculator';

const router = Router();
const paymentClient = new PaymentServiceClient();
const calculator = new SettlementCalculator();

// Settlement endpoints that call the gRPC Payment Service

/**
 * @swagger
 * /api/settlements/charges:
 *   post:
 *     summary: Issue charges for a settlement
 *     description: Creates settlement charges via gRPC call to Payment Service
 *     tags: [Settlements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SettlementChargeRequest'
 *     responses:
 *       201:
 *         description: Settlement charge issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SettlementResponse'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Settlement charge failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/settlements/{settlement_id}/confirm:
 *   put:
 *     summary: Confirm a settlement payment
 *     description: Confirms settlement payment via gRPC call to Payment Service
 *     tags: [Settlements]
 *     parameters:
 *       - in: path
 *         name: settlement_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Settlement ID to confirm
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfirmPaymentRequest'
 *     responses:
 *       200:
 *         description: Settlement payment confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SettlementResponse'
 *       500:
 *         description: Settlement confirmation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

/**
 * @swagger
 * /api/settlements/calculate:
 *   post:
 *     summary: Calculate settlement amounts for event participants
 *     description: Calculates court fees, shuttlecock fees, and penalties based on player participation
 *     tags: [Settlements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [players, courts, costs]
 *             properties:
 *               players:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [playerId, startTime, endTime, status]
 *                   properties:
 *                     playerId:
 *                       type: string
 *                       description: Player ID
 *                     startTime:
 *                       type: string
 *                       description: Start time (HH:mm format)
 *                       example: "20:00"
 *                     endTime:
 *                       type: string
 *                       description: End time (HH:mm format)
 *                       example: "22:00"
 *                     status:
 *                       type: string
 *                       enum: [played, no_show]
 *                       description: Player participation status
 *               courts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [courtNumber, startTime, endTime, hourlyRate]
 *                   properties:
 *                     courtNumber:
 *                       type: number
 *                       description: Court number
 *                     startTime:
 *                       type: string
 *                       description: Court start time (HH:mm format)
 *                       example: "20:00"
 *                     endTime:
 *                       type: string
 *                       description: Court end time (HH:mm format)
 *                       example: "22:00"
 *                     hourlyRate:
 *                       type: number
 *                       description: Court hourly rate in THB
 *                       example: 200
 *               costs:
 *                 type: object
 *                 required: [shuttlecockPrice, shuttlecockCount, penaltyFee]
 *                 properties:
 *                   shuttlecockPrice:
 *                     type: number
 *                     description: Price per shuttlecock in THB
 *                     example: 40
 *                   shuttlecockCount:
 *                     type: number
 *                     description: Number of shuttlecocks used
 *                     example: 3
 *                   penaltyFee:
 *                     type: number
 *                     description: Penalty fee for no-show players in THB
 *                     example: 100
 *           example:
 *             players:
 *               - playerId: "player_A"
 *                 startTime: "20:00"
 *                 endTime: "22:00"
 *                 status: "played"
 *               - playerId: "player_B"
 *                 startTime: "20:00"
 *                 endTime: "21:00"
 *                 status: "played"
 *               - playerId: "player_C"
 *                 startTime: "21:00"
 *                 endTime: "22:00"
 *                 status: "played"
 *               - playerId: "player_D"
 *                 startTime: "20:00"
 *                 endTime: "22:00"
 *                 status: "no_show"
 *             courts:
 *               - courtNumber: 1
 *                 startTime: "20:00"
 *                 endTime: "22:00"
 *                 hourlyRate: 200
 *             costs:
 *               shuttlecockPrice: 40
 *               shuttlecockCount: 3
 *               penaltyFee: 100
 *     responses:
 *       200:
 *         description: Settlement calculation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     settlements:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           playerId:
 *                             type: string
 *                           courtFee:
 *                             type: number
 *                           shuttlecockFee:
 *                             type: number
 *                           penaltyFee:
 *                             type: number
 *                           totalAmount:
 *                             type: number
 *                           breakdown:
 *                             type: object
 *                             properties:
 *                               hoursPlayed:
 *                                 type: number
 *                               courtSessions:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     hour:
 *                                       type: string
 *                                     playersInSession:
 *                                       type: number
 *                                     costPerPlayer:
 *                                       type: number
 *                     totalCollected:
 *                       type: number
 *                       description: Total amount to be collected from all players
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { players, courts, costs } = req.body;

    Logger.info('Settlement calculation request received', {
      playersCount: players?.length || 0,
      courtsCount: courts?.length || 0,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!players || !courts || !costs) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Missing required fields: players, courts, and costs are required',
        details: { required_fields: ['players', 'courts', 'costs'] }
      });
    }

    // Calculate settlements
    const settlements = calculator.calculateSettlements(players, courts, costs);
    const totalCollected = settlements.reduce((sum, s) => sum + s.totalAmount, 0);

    Logger.success('Settlement calculation completed', {
      settlementsCount: settlements.length,
      totalAmount: totalCollected
    });

    res.status(200).json({
      success: true,
      data: {
        settlements,
        totalCollected: Math.round(totalCollected * 100) / 100 // Round to 2 decimal places
      },
      message: 'Settlement calculation completed successfully'
    });

  } catch (error) {
    Logger.error('Settlement calculation failed', error);

    res.status(500).json({
      success: false,
      code: 'SETTLEMENT_CALCULATION_FAILED',
      message: 'Failed to calculate settlement amounts',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
});

/**
 * @swagger
 * /api/settlements/calculate-and-charge:
 *   post:
 *     summary: Calculate settlements and issue charges to Payment Service
 *     description: Calculates settlement amounts and automatically issues charges via gRPC to Payment Service
 *     tags: [Settlements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event_id, players, courts, costs]
 *             properties:
 *               event_id:
 *                 type: string
 *                 description: Event ID for the settlement
 *                 example: "event_123"
 *               players:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [playerId, startTime, endTime, status]
 *                   properties:
 *                     playerId:
 *                       type: string
 *                     startTime:
 *                       type: string
 *                       example: "20:00"
 *                     endTime:
 *                       type: string
 *                       example: "22:00"
 *                     status:
 *                       type: string
 *                       enum: [played, no_show]
 *               courts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [courtNumber, startTime, endTime, hourlyRate]
 *                   properties:
 *                     courtNumber:
 *                       type: number
 *                     startTime:
 *                       type: string
 *                       example: "20:00"
 *                     endTime:
 *                       type: string
 *                       example: "22:00"
 *                     hourlyRate:
 *                       type: number
 *                       example: 200
 *               costs:
 *                 type: object
 *                 required: [shuttlecockPrice, shuttlecockCount, penaltyFee]
 *                 properties:
 *                   shuttlecockPrice:
 *                     type: number
 *                     example: 40
 *                   shuttlecockCount:
 *                     type: number
 *                     example: 3
 *                   penaltyFee:
 *                     type: number
 *                     example: 100
 *               currency:
 *                 type: string
 *                 description: Currency code
 *                 default: "THB"
 *                 example: "THB"
 *     responses:
 *       201:
 *         description: Settlements calculated and charges issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     settlements:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           playerId:
 *                             type: string
 *                           totalAmount:
 *                             type: number
 *                           paymentResponse:
 *                             type: object
 *                             description: Response from Payment Service gRPC
 *                     totalCollected:
 *                       type: number
 *                     successfulCharges:
 *                       type: number
 *                     failedCharges:
 *                       type: number
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Settlement calculation or charging failed
 */
router.post('/calculate-and-charge', async (req: Request, res: Response) => {
  try {
    const { event_id, players, courts, costs, currency = 'THB' } = req.body;

    Logger.info('Settlement calculate-and-charge request received', {
      event_id,
      playersCount: players?.length || 0,
      courtsCount: courts?.length || 0,
      currency,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!event_id || !players || !courts || !costs) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Missing required fields: event_id, players, courts, and costs are required',
        details: { required_fields: ['event_id', 'players', 'courts', 'costs'] }
      });
    }

    // Calculate settlements
    const settlements = calculator.calculateSettlements(players, courts, costs);
    const totalCollected = settlements.reduce((sum, s) => sum + s.totalAmount, 0);

    Logger.info('Settlement calculation completed, proceeding to charge players', {
      settlementsCount: settlements.length,
      totalAmount: totalCollected
    });

    // Issue charges to Payment Service for each player
    const chargeResults = [];
    let successfulCharges = 0;
    let failedCharges = 0;

    for (const settlement of settlements) {
      try {
        // Only charge if there's an amount to collect
        if (settlement.totalAmount > 0) {
          const chargeRequest = {
            player_id: settlement.playerId,
            amount: settlement.totalAmount,
            currency: currency,
            event_id: event_id,
            description: `Settlement charge for event ${event_id} - Court: ${settlement.courtFee}, Shuttlecock: ${settlement.shuttlecockFee}, Penalty: ${settlement.penaltyFee}`,
            metadata: {
              court_fee: settlement.courtFee.toString(),
              shuttlecock_fee: settlement.shuttlecockFee.toString(),
              penalty_fee: settlement.penaltyFee.toString(),
              hours_played: settlement.breakdown.hoursPlayed.toString(),
              settlement_type: 'event_settlement'
            }
          };

          Logger.grpc('Issuing charge to Payment Service', {
            player_id: settlement.playerId,
            amount: settlement.totalAmount,
            currency
          });

          const paymentResponse = await paymentClient.issueCharges(chargeRequest);

          chargeResults.push({
            playerId: settlement.playerId,
            totalAmount: settlement.totalAmount,
            courtFee: settlement.courtFee,
            shuttlecockFee: settlement.shuttlecockFee,
            penaltyFee: settlement.penaltyFee,
            breakdown: settlement.breakdown,
            paymentResponse,
            status: 'success'
          });

          successfulCharges++;

          Logger.success('Payment charge successful', {
            player_id: settlement.playerId,
            payment_id: paymentResponse.id,
            amount: settlement.totalAmount
          });
        } else {
          // No amount to charge (shouldn't happen in normal cases)
          chargeResults.push({
            playerId: settlement.playerId,
            totalAmount: 0,
            courtFee: settlement.courtFee,
            shuttlecockFee: settlement.shuttlecockFee,
            penaltyFee: settlement.penaltyFee,
            breakdown: settlement.breakdown,
            paymentResponse: null,
            status: 'skipped',
            reason: 'No amount to charge'
          });
        }
      } catch (error) {
        Logger.error('Payment charge failed for player', {
          player_id: settlement.playerId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        chargeResults.push({
          playerId: settlement.playerId,
          totalAmount: settlement.totalAmount,
          courtFee: settlement.courtFee,
          shuttlecockFee: settlement.shuttlecockFee,
          penaltyFee: settlement.penaltyFee,
          breakdown: settlement.breakdown,
          paymentResponse: null,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        failedCharges++;
      }
    }

    Logger.success('Settlement calculate-and-charge completed', {
      event_id,
      totalAmount: totalCollected,
      successfulCharges,
      failedCharges
    });

    res.status(201).json({
      success: true,
      data: {
        event_id,
        settlements: chargeResults,
        totalCollected: Math.round(totalCollected * 100) / 100,
        successfulCharges,
        failedCharges,
        summary: {
          totalPlayers: settlements.length,
          playersCharged: successfulCharges,
          chargesFailed: failedCharges
        }
      },
      message: `Settlement calculation and charging completed. ${successfulCharges} successful, ${failedCharges} failed charges.`
    });

  } catch (error) {
    Logger.error('Settlement calculate-and-charge failed', error);

    res.status(500).json({
      success: false,
      code: 'SETTLEMENT_CALCULATE_AND_CHARGE_FAILED',
      message: 'Failed to calculate settlements and issue charges',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
});

export default router;