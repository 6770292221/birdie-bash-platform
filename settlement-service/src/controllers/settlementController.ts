import { Request, Response } from 'express';
import { PaymentServiceClient } from '../clients/paymentClient';
import { Logger } from '../utils/logger';
import { SettlementCalculator } from '../services/settlementCalculator';
import { Settlement, SettlementStatus } from '../models/Settlement';
import { v4 as uuidv4 } from 'uuid';

const paymentClient = new PaymentServiceClient();
const calculator = new SettlementCalculator();

export const issueCharges = async (req: Request, res: Response) => {
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
};

export const confirmPayment = async (req: Request, res: Response) => {
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
};

export const refundPayment = async (req: Request, res: Response) => {
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
};

export const getPaymentStatus = async (req: Request, res: Response) => {
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
};

export const getPlayerPayments = async (req: Request, res: Response) => {
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
};

export const calculateSettlements = async (req: Request, res: Response) => {
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
};

export const calculateAndCharge = async (req: Request, res: Response) => {
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

    // Create settlement record in database
    const settlementId = `settlement_${Date.now()}_${uuidv4().split('-')[0]}`;

    const settlementRecord = new Settlement({
      settlementId,
      eventId: event_id,
      eventData: {
        players,
        courts,
        costs,
        currency
      },
      calculationResults: settlements.map(settlement => ({
        playerId: settlement.playerId,
        courtFee: settlement.courtFee,
        shuttlecockFee: settlement.shuttlecockFee,
        penaltyFee: settlement.penaltyFee,
        totalAmount: settlement.totalAmount,
        breakdown: settlement.breakdown
      })),
      totalCollected: Math.round(totalCollected * 100) / 100,
      successfulCharges: 0,
      failedCharges: 0,
      status: SettlementStatus.PROCESSING
    });

    Logger.info('Settlement calculation completed, proceeding to charge players', {
      settlementId,
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

          // Update settlement record with payment info
          const resultIndex = settlementRecord.calculationResults.findIndex(r => r.playerId === settlement.playerId);
          if (resultIndex >= 0) {
            settlementRecord.calculationResults[resultIndex].paymentId = paymentResponse.id;
            settlementRecord.calculationResults[resultIndex].paymentStatus = paymentResponse.status;
          }

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

    // Update settlement record with final results
    settlementRecord.successfulCharges = successfulCharges;
    settlementRecord.failedCharges = failedCharges;
    settlementRecord.status = failedCharges === 0 ? SettlementStatus.COMPLETED : SettlementStatus.PARTIALLY_REFUNDED;

    // Save to database
    await settlementRecord.save();

    Logger.success('Settlement calculate-and-charge completed', {
      settlementId,
      event_id,
      totalAmount: totalCollected,
      successfulCharges,
      failedCharges
    });

    res.status(201).json({
      success: true,
      data: {
        settlementId,
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
};

export const getAllSettlements = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, event_id, status } = req.query;
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    // Build filter
    const filter: any = {};
    if (event_id) filter.eventId = event_id;
    if (status) filter.status = status;

    Logger.info('Get all settlements request received', {
      filter,
      page: pageNumber,
      limit: limitNumber
    });

    // Get settlements with pagination
    const [settlements, total] = await Promise.all([
      Settlement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .select('_id settlementId eventId calculationResults status createdAt updatedAt'),
      Settlement.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNumber);

    Logger.success('Settlements retrieved successfully', {
      count: settlements.length,
      total,
      page: pageNumber,
      totalPages
    });

    // Transform settlements to remove _id from subdocuments
    const transformedSettlements = settlements.map(settlement => {
      const settlementObj = settlement.toObject();

      // Remove _id from calculationResults and nested courtSessions
      if (settlementObj.calculationResults) {
        settlementObj.calculationResults = settlementObj.calculationResults.map((result: any) => {
          const { _id, ...resultWithoutId } = result;
          if (resultWithoutId.breakdown && resultWithoutId.breakdown.courtSessions) {
            resultWithoutId.breakdown.courtSessions = resultWithoutId.breakdown.courtSessions.map((session: any) => {
              const { _id, ...sessionWithoutId } = session;
              return sessionWithoutId;
            });
          }
          return resultWithoutId;
        });
      }

      return settlementObj;
    });

    res.status(200).json({
      success: true,
      data: {
        settlements: transformedSettlements,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages,
          hasNext: pageNumber < totalPages,
          hasPrev: pageNumber > 1
        }
      },
      message: 'Settlements retrieved successfully'
    });

  } catch (error) {
    Logger.error('Get all settlements failed', error);

    res.status(500).json({
      success: false,
      code: 'GET_SETTLEMENTS_FAILED',
      message: 'Failed to retrieve settlements',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
};

export const getSettlementById = async (req: Request, res: Response) => {
  try {
    const { settlement_id } = req.params;

    Logger.info('Get settlement by ID request received', { settlement_id });

    const settlement = await Settlement.findOne({
      settlementId: settlement_id
    }).select('_id settlementId eventId calculationResults status createdAt updatedAt');

    if (!settlement) {
      return res.status(404).json({
        success: false,
        code: 'SETTLEMENT_NOT_FOUND',
        message: 'Settlement not found',
        details: { settlement_id }
      });
    }

    Logger.success('Settlement retrieved successfully', {
      settlement_id: settlement.settlementId,
      eventId: settlement.eventId
    });

    // Transform settlement to remove _id from subdocuments
    const settlementObj = settlement.toObject();

    // Remove _id from calculationResults and nested courtSessions
    if (settlementObj.calculationResults) {
      settlementObj.calculationResults = settlementObj.calculationResults.map((result: any) => {
        const { _id, ...resultWithoutId } = result;
        if (resultWithoutId.breakdown && resultWithoutId.breakdown.courtSessions) {
          resultWithoutId.breakdown.courtSessions = resultWithoutId.breakdown.courtSessions.map((session: any) => {
            const { _id, ...sessionWithoutId } = session;
            return sessionWithoutId;
          });
        }
        return resultWithoutId;
      });
    }

    res.status(200).json({
      success: true,
      data: {
        settlement: settlementObj
      },
      message: 'Settlement retrieved successfully'
    });

  } catch (error) {
    Logger.error('Get settlement by ID failed', error);

    res.status(500).json({
      success: false,
      code: 'GET_SETTLEMENT_FAILED',
      message: 'Failed to retrieve settlement',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
};