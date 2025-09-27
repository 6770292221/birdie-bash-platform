import { Request, Response } from 'express';
import { RabbitMQPublisher } from '../clients/rabbitmqClient';
import { Logger } from '../utils/logger';
import { SettlementCalculator } from '../services/settlementCalculator';
import { Settlement, SettlementStatus } from '../models/Settlement';
import { v4 as uuidv4 } from 'uuid';

const rabbitMQPublisher = new RabbitMQPublisher();
const calculator = new SettlementCalculator();

// Simple in-memory cache for player data (valid for 5 minutes)
const playerDataCache = new Map<string, { data: { name: string; phoneNumber: string }, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to fetch real-time player data with caching
async function fetchPlayerDisplayData(player: any, authHeader: string, eventId?: string): Promise<{ name: string; phoneNumber: string }> {
  try {
    // Check cache first using playerId
    const cacheKey = player.playerId;
    const cached = playerDataCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';

    // Try to fetch from Registration Service
    if (eventId) {
      try {
        const playersResponse = await fetch(`${gatewayUrl}/api/registration/events/${eventId}/players?limit=100`, {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });

        if (playersResponse.ok) {
          const playersData = await playersResponse.json() as any;
          const players = playersData.players || [];
          const playerInfo = players.find((p: any) => (p.playerId || p.id) === player.playerId);

          if (playerInfo) {
            const result = {
              name: playerInfo.name || `Player ${player.playerId.slice(-6)}`,
              phoneNumber: playerInfo.phoneNumber || 'N/A'
            };
            // Cache the result
            playerDataCache.set(cacheKey, { data: result, timestamp: now });
            return result;
          }
        }
      } catch (error) {
        Logger.info('Failed to fetch player data from Registration Service', {
          playerId: player.playerId,
          eventId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

  } catch (error) {
    Logger.error('Error in fetchPlayerDisplayData', {
      playerId: player.playerId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Final fallback
  return {
    name: `Player ${player.playerId.slice(-6)}`,
    phoneNumber: 'N/A'
  };
}

export const calculateAndCharge = async (req: Request, res: Response) => {
  try {
    const { event_id, eventId } = req.body;
    const finalEventId = event_id || eventId;

    Logger.info('Settlement issue request received', {
      event_id: finalEventId,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!finalEventId) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Missing required field: event_id or eventId is required',
        details: { required_fields: ['event_id', 'eventId'] }
      });
    }

    // Fetch event details
    let eventData: any;
    try {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
      const fullUrl = `${gatewayUrl}/api/events/${finalEventId}`;
      const authHeader = req.headers.authorization || '';

      Logger.info('Fetching event details', {
        event_id: finalEventId,
        gatewayUrl,
        fullUrl,
        hasAuth: !!authHeader,
        authHeaderLength: authHeader.length
      });

      const eventResponse = await fetch(fullUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      Logger.info('Event API response received', {
        event_id: finalEventId,
        status: eventResponse.status,
        statusText: eventResponse.statusText,
        headers: Object.fromEntries(eventResponse.headers.entries())
      });

      if (!eventResponse.ok) {
        Logger.error('Failed to fetch event details', {
          event_id: finalEventId,
          status: eventResponse.status
        });
        return res.status(404).json({
          success: false,
          code: 'EVENT_NOT_FOUND',
          message: `Event with ID ${event_id} not found`,
          details: {
            event_id: finalEventId,
            status: eventResponse.status
          }
        });
      }

      const eventResponseData = await eventResponse.json() as any;
      eventData = eventResponseData.event;

      if (!eventData) {
        Logger.error('Event data not found in response', { event_id });
        return res.status(400).json({
          success: false,
          code: 'EVENT_DATA_NOT_FOUND',
          message: 'Event data is missing from response',
          details: { event_id }
        });
      }

    } catch (error) {
      Logger.error('Error fetching event details', {
        event_id: finalEventId,
        gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:3000',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      return res.status(500).json({
        success: false,
        code: 'FETCH_EVENT_ERROR',
        message: 'Failed to fetch event information',
        details: {
          event_id: finalEventId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    // Fetch players/participants
    let players: any[];
    try {
      Logger.info('Fetching event players', { event_id });
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
      const playersResponse = await fetch(`${gatewayUrl}/api/registration/events/${finalEventId}/players`, {
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      });
      if (!playersResponse.ok) {
        Logger.error('Failed to fetch event players', {
          event_id: finalEventId,
          status: playersResponse.status
        });
        return res.status(404).json({
          success: false,
          code: 'PLAYERS_NOT_FOUND',
          message: `Players for event ${event_id} not found`,
          details: {
            event_id: finalEventId,
            status: playersResponse.status
          }
        });
      }

      const playersResponseData = await playersResponse.json() as any;
      players = playersResponseData.players || [];

      if (players.length === 0) {
        return res.status(400).json({
          success: false,
          code: 'NO_PLAYERS_FOUND',
          message: 'No players found for this event',
          details: { event_id }
        });
      }


      // Transform players to settlement format
      players = await Promise.all(players.map(async (player: any) => {
        // Check if player is marked as penalty (absent/late)
        const isPenalty = player.isPenalty === true;

        // Map registration status to settlement status
        let settlementStatus = "played"; // Default
        if (isPenalty) {
          settlementStatus = "absent"; // Override to absent if penalty is true
        } else if (player.status === "registered") {
          settlementStatus = "played";
        } else if (player.status === "canceled") {
          settlementStatus = "canceled";
        } else if (player.status === "waitlist") {
          settlementStatus = "waitlist";
        }

        Logger.info('Player status determination', {
          playerId: player.playerId || player.id,
          originalStatus: player.status,
          isPenalty,
          finalStatus: settlementStatus
        });

        // Determine role and fetch name based on userId presence
        let playerRole = "guest"; // Default
        let playerName = player.name; // Default from registration
        let playerPhoneNumber = player.phoneNumber; // Default from registration

        if (player.userId) {
          playerRole = "member";

          // Fetch user details from auth API
          try {
            Logger.info('Fetching user details for player transformation', {
              userId: player.userId,
              playerId: player.playerId
            });

            const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
            const userResponse = await fetch(`${gatewayUrl}/api/auth/user/${player.userId}`, {
              headers: {
                'Authorization': req.headers.authorization || ''
              }
            });

            if (userResponse.ok) {
              const userData = await userResponse.json() as any;
              console.log('Auth API response for player transform, userId', player.userId, ':', JSON.stringify(userData, null, 2));

              if (userData.user && userData.user.name) {
                playerName = userData.user.name; // Use auth API name
                playerPhoneNumber = userData.user.phoneNumber || player.phoneNumber; // Use auth API phoneNumber if available
                Logger.info('Using auth API data for player transform', {
                  userId: player.userId,
                  authName: userData.user.name,
                  registrationName: player.name
                });
              } else {
                Logger.info('Auth API returned no name, keeping registration name', {
                  userId: player.userId,
                  registrationName: player.name
                });
              }
            } else {
              Logger.error('Failed to fetch user details for player transform', {
                userId: player.userId,
                playerId: player.playerId,
                status: userResponse.status
              });
            }
          } catch (error) {
            Logger.error('Error fetching user details for player transform', {
              userId: player.userId,
              playerId: player.playerId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        return {
          playerId: player.playerId || player.id,
          userId: player.userId || null,
          startTime: settlementStatus === 'absent' ? '00:00' : (player.startTime || '09:00'),
          endTime: settlementStatus === 'absent' ? '00:00' : (player.endTime || '10:00'),
          status: settlementStatus,
          role: playerRole,
          name: playerName,
          phoneNumber: playerPhoneNumber
        };
      }));

    } catch (error) {
      Logger.error('Error fetching event players', {
        event_id: finalEventId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return res.status(500).json({
        success: false,
        code: 'FETCH_PLAYERS_ERROR',
        message: 'Failed to fetch event players',
        details: {
          event_id: finalEventId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    // Transform event data to settlement format
    const courts = eventData.courts.map((court: any) => ({
      courtNumber: court.courtNumber,
      startTime: court.startTime,
      endTime: court.endTime,
      hourlyRate: eventData.courtHourlyRate
    }));

    const costs = {
      shuttlecockPrice: eventData.shuttlecockPrice,
      shuttlecockCount: eventData.shuttlecockCount || 0,
      penaltyFee: eventData.penaltyFee || eventData.absentPenaltyFee || 0 // Read penalty fee from event data
    };

    Logger.info('Event penalty fee check', {
      event_id,
      absentPenaltyFee: eventData.penaltyFee || eventData.absentPenaltyFee,
      finalPenaltyFee: costs.penaltyFee,
      eventDataKeys: Object.keys(eventData)
    });

    Logger.info('Event data transformed for settlement', {
      event_id,
      playersCount: players.length,
      courtsCount: courts.length,
      costs
    });

    // Get event creator details
    let eventCreatorPhoneNumber: string | undefined;
    const createdBy = eventData.createdBy;

    if (createdBy) {
      try {
        Logger.info('Fetching event creator details', { createdBy });
        const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
        const userResponse = await fetch(`${gatewayUrl}/api/auth/user/${createdBy}`, {
          headers: {
            'Authorization': req.headers.authorization || ''
          }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json() as any;
          eventCreatorPhoneNumber = userData.user?.phoneNumber;

          Logger.info('Event creator phone number retrieved', {
            createdBy,
            phoneNumber: eventCreatorPhoneNumber
          });
        } else {
          Logger.error('Failed to fetch user details', {
            createdBy,
            status: userResponse.status
          });
        }
      } catch (error) {
        Logger.error('Error fetching event creator details', {
          createdBy,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Calculate settlements
    Logger.info('Starting settlement calculation', {
      playersCount: players.length,
      absentPlayersCount: players.filter(p => p.status === 'absent').length,
      playedPlayersCount: players.filter(p => p.status === 'played').length,
      penaltyFee: costs.penaltyFee
    });

    const settlements = calculator.calculateSettlements(players, courts, costs);
    const totalCollected = settlements.reduce((sum, s) => sum + s.totalAmount, 0);

    Logger.info('Settlement calculation results', {
      settlementsCount: settlements.length,
      totalCollected,
      penaltyOnlySettlements: settlements.filter(s => s.penaltyFee > 0 && s.courtFee === 0).length
    });

    // Merge player data with settlement calculations
    const mergedPlayers = settlements.map((settlement) => {
      const player = players.find(p => p.playerId === settlement.playerId);

      Logger.info('Merging player data with settlement calculation', {
        playerId: settlement.playerId,
        playerName: player?.name,
        phoneNumber: player?.phoneNumber
      });

      return {
        // Player info
        playerId: settlement.playerId,
        name: player?.name || null,
        phoneNumber: player?.phoneNumber || null,
        // Settlement calculation results
        courtFee: settlement.courtFee,
        shuttlecockFee: settlement.shuttlecockFee,
        penaltyFee: settlement.penaltyFee,
        totalAmount: settlement.totalAmount,
        paymentId: null,
        paymentStatus: null,
        breakdown: settlement.breakdown
      };
    });

    // Create settlement record in database with player data
    const settlementId = `settlement_${Date.now()}_${uuidv4().split('-')[0]}`;

    // Prepare breakdown data for settlement record
    const breakdownData = settlements.map(settlement => ({
      playerId: settlement.playerId,
      courtFee: settlement.courtFee,
      shuttlecockFee: settlement.shuttlecockFee,
      penaltyFee: settlement.penaltyFee,
      totalAmount: settlement.totalAmount,
      paymentId: null,
      paymentStatus: null,
      breakdown: settlement.breakdown
    }));

    const settlementRecord = new Settlement({
      settlementId,
      eventId: finalEventId,
      breakdown: breakdownData,
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

    // Save settlement record first
    await settlementRecord.save();

    // Issue charges and update payment info in Settlement record
    const chargeResults = [];
    let successfulCharges = 0;
    let failedCharges = 0;

    for (let i = 0; i < settlements.length; i++) {
      const settlement = settlements[i];
      try {
        // Debug: Log settlement data before charging
        console.log('🔍 Settlement data for player:', settlement.playerId);
        console.log('🔍 Settlement breakdown:', JSON.stringify(settlement.breakdown, null, 2));

        // Only charge if there's an amount to collect
        console.log('settlement >>>,', settlement);
        if (settlement.totalAmount > 0) {
          const chargeRequest = {
            player_id: settlement.playerId,
            amount: settlement.totalAmount,
            currency: 'THB',
            event_id: finalEventId,
            description: `Settlement charge for event ${finalEventId} - Court: ${settlement.courtFee}, Shuttlecock: ${settlement.shuttlecockFee}, Penalty: ${settlement.penaltyFee}`,
            metadata: {
              court_fee: settlement.courtFee.toString(),
              shuttlecock_fee: settlement.shuttlecockFee.toString(),
              penalty_fee: settlement.penaltyFee.toString(),
              hours_played: settlement.breakdown.hoursPlayed.toString(),
              settlement_type: 'event_settlement',
              event_creator_phone: eventCreatorPhoneNumber || ''
            }
          };

          Logger.info('Publishing charge message to RabbitMQ', {
            player_id: settlement.playerId,
            amount: settlement.totalAmount,
            currency: 'THB'
          });

          const paymentResponse = await rabbitMQPublisher.publishPaymentCharge(chargeRequest);

          console.log('paymentResponse >>>', paymentResponse);

          // Update Settlement breakdown record with payment info
          settlementRecord.breakdown[i].paymentId = paymentResponse.id;
          settlementRecord.breakdown[i].paymentStatus = paymentResponse.status;

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

        // Note: Settlement record will be saved after all charges are processed

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
    settlementRecord.status = failedCharges === 0 ? SettlementStatus.COMPLETED : SettlementStatus.FAILED;

    // Save to database
    await settlementRecord.save();

    Logger.success('Settlement issue completed', {
      settlementId,
      event_id,
      totalAmount: totalCollected,
      successfulCharges,
      failedCharges
    });

    // Update event status to completed after successful settlement
    try {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
      const updateEventResponse = await fetch(`${gatewayUrl}/api/events/${finalEventId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': req.headers.authorization || '',
          'Content-Type': 'application/json'
        },
        // body: JSON.stringify({ status: 'awaiting_payment' })
        body: JSON.stringify({ status: 'calculating' })
      });

      if (updateEventResponse.ok) {
        Logger.success('Event status updated to completed', { event_id });
      } else {
        Logger.error('Failed to update event status', {
          event_id: finalEventId,
          status: updateEventResponse.status,
          statusText: updateEventResponse.statusText
        });
      }
    } catch (error) {
      Logger.error('Error updating event status', {
        event_id: finalEventId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't fail the entire settlement process if event status update fails
    }

    // Debug: Log final settlement record
    console.log('🔍 Final settlement record before save:', JSON.stringify(settlementRecord.toObject(), null, 2));

    res.status(201).json({
      success: true,
      data: {
        settlementId,
        event_id: finalEventId,
        calculationResults: settlementRecord.breakdown.map(player => ({
          playerId: player.playerId,
          courtFee: player.courtFee,
          shuttlecockFee: player.shuttlecockFee,
          penaltyFee: player.penaltyFee,
          totalAmount: player.totalAmount,
          paymentId: player.paymentId,
          paymentStatus: player.paymentStatus,
          breakdown: player.breakdown
        })),
        totalCollected: Math.round(totalCollected * 100) / 100,
        successfulCharges,
        failedCharges
      },
      message: `Settlement calculation and charging completed. ${successfulCharges} successful, ${failedCharges} failed charges.`
    });

  } catch (error) {
    Logger.error('Settlement issue failed', error);

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
        .select('settlementId eventId breakdown totalCollected successfulCharges failedCharges status createdAt updatedAt'),
      Settlement.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNumber);

    Logger.success('Settlements retrieved successfully', {
      count: settlements.length,
      total,
      page: pageNumber,
      totalPages
    });

    // Transform settlements to clean format
    const transformedSettlements = settlements.map(settlement => {
      const settlementObj = settlement.toObject();

      // Return settlement calculation results with breakdown (no player details, just playerId reference)
      const calculationResults = (settlementObj.breakdown || []).map((player: any) => {
        return {
          playerId: player.playerId,
          breakdown: {
            hoursPlayed: player.breakdown?.hoursPlayed || 0,
            courtSessions: player.breakdown?.courtSessions?.map((session: any) => ({
              hour: session.hour,
              playersInSession: session.playersInSession,
              costPerPlayer: session.costPerPlayer
            })) || []
          },
          courtFee: player.courtFee,
          shuttlecockFee: player.shuttlecockFee,
          penaltyFee: player.penaltyFee,
          totalAmount: player.totalAmount,
          paymentId: player.paymentId,
          paymentStatus: player.paymentStatus
        };
      });

      return {
        settlementId: settlementObj.settlementId,
        eventId: settlementObj.eventId,
        calculationResults: calculationResults,
        totalCollected: settlementObj.totalCollected,
        successfulCharges: settlementObj.successfulCharges,
        failedCharges: settlementObj.failedCharges,
        status: settlementObj.status,
        createdAt: settlementObj.createdAt,
        updatedAt: settlementObj.updatedAt
      };
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

export const calculateSettlements = async (req: Request, res: Response) => {
  try {
    const { event_id, eventId } = req.body;
    const finalEventId = event_id || eventId;

    Logger.info('Settlement calculate request received', {
      event_id: finalEventId,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!finalEventId) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Missing required field: event_id or eventId is required',
        details: { required_fields: ['event_id', 'eventId'] }
      });
    }

    // Fetch event details
    let eventData: any;
    try {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
      const fullUrl = `${gatewayUrl}/api/events/${finalEventId}`;
      const authHeader = req.headers.authorization || '';

      Logger.info('Fetching event details', {
        event_id: finalEventId,
        gatewayUrl,
        fullUrl,
        hasAuth: !!authHeader,
        authHeaderLength: authHeader.length
      });

      const eventResponse = await fetch(fullUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      Logger.info('Event API response received', {
        event_id: finalEventId,
        status: eventResponse.status,
        statusText: eventResponse.statusText,
        headers: Object.fromEntries(eventResponse.headers.entries())
      });

      if (!eventResponse.ok) {
        Logger.error('Failed to fetch event details', {
          event_id: finalEventId,
          status: eventResponse.status
        });
        return res.status(404).json({
          success: false,
          code: 'EVENT_NOT_FOUND',
          message: `Event with ID ${event_id} not found`,
          details: {
            event_id: finalEventId,
            status: eventResponse.status
          }
        });
      }

      const eventResponseData = await eventResponse.json() as any;
      eventData = eventResponseData.event;

      if (!eventData) {
        Logger.error('Event data not found in response', { event_id });
        return res.status(400).json({
          success: false,
          code: 'EVENT_DATA_NOT_FOUND',
          message: 'Event data is missing from response',
          details: { event_id }
        });
      }

    } catch (error) {
      Logger.error('Error fetching event details', {
        event_id: finalEventId,
        gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:3000',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      return res.status(500).json({
        success: false,
        code: 'FETCH_EVENT_ERROR',
        message: 'Failed to fetch event information',
        details: {
          event_id: finalEventId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    // Fetch players/participants
    let players: any[];
    try {
      Logger.info('Fetching event players', { event_id });
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
      const playersResponse = await fetch(`${gatewayUrl}/api/registration/events/${finalEventId}/players`, {
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      });
      if (!playersResponse.ok) {
        Logger.error('Failed to fetch event players', {
          event_id: finalEventId,
          status: playersResponse.status
        });
        return res.status(404).json({
          success: false,
          code: 'PLAYERS_NOT_FOUND',
          message: `Players for event ${event_id} not found`,
          details: {
            event_id: finalEventId,
            status: playersResponse.status
          }
        });
      }

      const playersResponseData = await playersResponse.json() as any;
      players = playersResponseData.players || [];

      if (players.length === 0) {
        return res.status(400).json({
          success: false,
          code: 'NO_PLAYERS_FOUND',
          message: 'No players found for this event',
          details: { event_id }
        });
      }

      // Transform players to settlement format
      players = await Promise.all(players.map(async (player: any) => {
        // Check if player is marked as penalty (absent/late)
        const isPenalty = player.isPenalty === true;

        // Map registration status to settlement status
        let settlementStatus = "played"; // Default
        if (isPenalty) {
          settlementStatus = "absent"; // Override to absent if penalty is true
        } else if (player.status === "registered") {
          settlementStatus = "played";
        } else if (player.status === "canceled") {
          settlementStatus = "canceled";
        } else if (player.status === "waitlist") {
          settlementStatus = "waitlist";
        }

        Logger.info('Player status determination', {
          playerId: player.playerId || player.id,
          originalStatus: player.status,
          isPenalty,
          finalStatus: settlementStatus
        });

        // Determine role and fetch name based on userId presence
        let playerRole = "guest"; // Default
        let playerName = player.name; // Default from registration
        let playerPhoneNumber = player.phoneNumber; // Default from registration

        if (player.userId) {
          playerRole = "member";

          // Fetch user details from auth API
          try {
            Logger.info('Fetching user details for player transformation', {
              userId: player.userId,
              playerId: player.playerId
            });

            const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
            const userResponse = await fetch(`${gatewayUrl}/api/auth/user/${player.userId}`, {
              headers: {
                'Authorization': req.headers.authorization || ''
              }
            });

            if (userResponse.ok) {
              const userData = await userResponse.json() as any;

              if (userData.user && userData.user.name) {
                playerName = userData.user.name; // Use auth API name
                playerPhoneNumber = userData.user.phoneNumber || player.phoneNumber; // Use auth API phoneNumber if available
                Logger.info('Using auth API data for player transform', {
                  userId: player.userId,
                  authName: userData.user.name,
                  registrationName: player.name
                });
              } else {
                Logger.info('Auth API returned no name, keeping registration name', {
                  userId: player.userId,
                  registrationName: player.name
                });
              }
            } else {
              Logger.error('Failed to fetch user details for player transform', {
                userId: player.userId,
                playerId: player.playerId,
                status: userResponse.status
              });
            }
          } catch (error) {
            Logger.error('Error fetching user details for player transform', {
              userId: player.userId,
              playerId: player.playerId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        return {
          playerId: player.playerId || player.id,
          userId: player.userId || null,
          startTime: settlementStatus === 'absent' ? '00:00' : (player.startTime || '09:00'),
          endTime: settlementStatus === 'absent' ? '00:00' : (player.endTime || '10:00'),
          status: settlementStatus,
          role: playerRole,
          name: playerName,
          phoneNumber: playerPhoneNumber
        };
      }));

    } catch (error) {
      Logger.error('Error fetching event players', {
        event_id: finalEventId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return res.status(500).json({
        success: false,
        code: 'FETCH_PLAYERS_ERROR',
        message: 'Failed to fetch event players',
        details: {
          event_id: finalEventId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    // Transform event data to settlement format
    const courts = eventData.courts.map((court: any) => ({
      courtNumber: court.courtNumber,
      startTime: court.startTime,
      endTime: court.endTime,
      hourlyRate: eventData.courtHourlyRate
    }));

    const costs = {
      shuttlecockPrice: eventData.shuttlecockPrice,
      shuttlecockCount: eventData.shuttlecockCount || 0,
      penaltyFee: eventData.penaltyFee || eventData.absentPenaltyFee || 0 // Read penalty fee from event data
    };

    Logger.info('Event penalty fee check', {
      event_id,
      absentPenaltyFee: eventData.penaltyFee || eventData.absentPenaltyFee,
      finalPenaltyFee: costs.penaltyFee,
      eventDataKeys: Object.keys(eventData)
    });

    Logger.info('Event data transformed for settlement calculation', {
      event_id,
      playersCount: players.length,
      courtsCount: courts.length,
      costs
    });

    // Calculate settlements (without saving to database)
    const settlements = calculator.calculateSettlements(players, courts, costs);
    const totalCollected = settlements.reduce((sum, s) => sum + s.totalAmount, 0);

    // Merge player data with settlement calculations
    const mergedPlayers = settlements.map((settlement) => {
      const player = players.find(p => p.playerId === settlement.playerId);

      Logger.info('Merging player data with settlement calculation', {
        playerId: settlement.playerId,
        playerName: player?.name,
        phoneNumber: player?.phoneNumber
      });

      return {
        // Player info
        playerId: settlement.playerId,
        name: player?.name || null,
        phoneNumber: player?.phoneNumber || null,
        // Settlement calculation results
        courtFee: settlement.courtFee,
        shuttlecockFee: settlement.shuttlecockFee,
        penaltyFee: settlement.penaltyFee,
        totalAmount: settlement.totalAmount,
        breakdown: settlement.breakdown
      };
    });

    Logger.success('Settlement calculation completed (preview mode)', {
      event_id: finalEventId,
      settlementsCount: settlements.length,
      totalAmount: totalCollected
    });

    res.status(200).json({
      success: true,
      data: {
        event_id: finalEventId,
        eventData: {
          courts,
          costs,
          currency: 'THB'
        },
        calculationResults: mergedPlayers,
        totalCollected: Math.round(totalCollected * 100) / 100,
        summary: {
          totalPlayers: players.length,
          playedPlayers: players.filter(p => p.status === 'played').length,
          absentPlayers: players.filter(p => p.status === 'absent').length,
          canceledPlayers: players.filter(p => p.status === 'canceled').length,
          waitlistPlayers: players.filter(p => p.status === 'waitlist').length
        }
      },
      message: 'Settlement calculation completed successfully (preview mode - no charges issued)'
    });

  } catch (error) {
    Logger.error('Settlement calculation failed', error);

    res.status(500).json({
      success: false,
      code: 'SETTLEMENT_CALCULATE_FAILED',
      message: 'Failed to calculate settlements',
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
    }).select('settlementId eventId breakdown totalCollected successfulCharges failedCharges status createdAt updatedAt');

    if (!settlement) {
      return res.status(404).json({
        success: false,
        code: 'SETTLEMENT_NOT_FOUND',
        message: 'Settlement not found',
        details: { settlement_id }
      });
    }

    const settlementObj = settlement.toObject();

    Logger.success('Settlement retrieved successfully', {
      settlement_id: settlement.settlementId,
      eventId: settlement.eventId,
      playersCount: (settlementObj.breakdown || []).length
    });

    // Return settlement calculation results with breakdown (no player details, just playerId reference)
    const calculationResults = (settlementObj.breakdown || []).map((player: any) => {
      return {
        playerId: player.playerId,
        breakdown: {
          hoursPlayed: player.breakdown?.hoursPlayed || 0,
          courtSessions: player.breakdown?.courtSessions?.map((session: any) => ({
            hour: session.hour,
            playersInSession: session.playersInSession,
            costPerPlayer: session.costPerPlayer
          })) || []
        },
        courtFee: player.courtFee,
        shuttlecockFee: player.shuttlecockFee,
        penaltyFee: player.penaltyFee,
        totalAmount: player.totalAmount,
        paymentId: player.paymentId,
        paymentStatus: player.paymentStatus
      };
    });

    // Create clean response with settlement data
    const cleanSettlement = {
      settlementId: settlementObj.settlementId,
      eventId: settlementObj.eventId,
      calculationResults: calculationResults,
      totalCollected: settlementObj.totalCollected,
      successfulCharges: settlementObj.successfulCharges,
      failedCharges: settlementObj.failedCharges,
      status: settlementObj.status,
      createdAt: settlementObj.createdAt,
      updatedAt: settlementObj.updatedAt
    };

    res.status(200).json({
      success: true,
      data: {
        settlement: cleanSettlement
      }
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