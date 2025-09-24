import { Request, Response } from 'express';
import { PaymentServiceClient } from '../clients/paymentClient';
import { Logger } from '../utils/logger';
import { SettlementCalculator } from '../services/settlementCalculator';
import { Settlement, SettlementStatus } from '../models/Settlement';
import { v4 as uuidv4 } from 'uuid';

const paymentClient = new PaymentServiceClient();
const calculator = new SettlementCalculator();

export const calculateAndCharge = async (req: Request, res: Response) => {
  try {
    const { event_id, shuttlecockCount, penaltyFee, currency = 'THB' } = req.body;

    Logger.info('Settlement issue request received', {
      event_id,
      currency,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!event_id) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Missing required field: event_id is required',
        details: { required_fields: ['event_id'] }
      });
    }

    // Fetch event details
    let eventData: any;
    try {
      Logger.info('Fetching event details', { event_id });
      const eventResponse = await fetch(`http://localhost:3002/api/events/${event_id}`, {
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      });

      if (!eventResponse.ok) {
        Logger.error('Failed to fetch event details', {
          event_id,
          status: eventResponse.status
        });
        return res.status(404).json({
          success: false,
          code: 'EVENT_NOT_FOUND',
          message: `Event with ID ${event_id} not found`,
          details: {
            event_id,
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
        event_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return res.status(500).json({
        success: false,
        code: 'FETCH_EVENT_ERROR',
        message: 'Failed to fetch event information',
        details: {
          event_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    // Fetch players/participants
    let players: any[];
    try {
      Logger.info('Fetching event players', { event_id });
      const playersResponse = await fetch(`http://localhost:3005/api/registration/events/${event_id}/players`, {
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      });
      if (!playersResponse.ok) {
        Logger.error('Failed to fetch event players', {
          event_id,
          status: playersResponse.status
        });
        return res.status(404).json({
          success: false,
          code: 'PLAYERS_NOT_FOUND',
          message: `Players for event ${event_id} not found`,
          details: {
            event_id,
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
        // Map registration status to settlement status
        let settlementStatus = "played"; // Default
        if (player.status === "registered") {
          settlementStatus = "played";
        } else if (player.status === "cancelled") {
          settlementStatus = "canceled";
        } else if (player.status === "waitlist") {
          settlementStatus = "waitlist";
        }

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

            const userResponse = await fetch(`http://localhost:3001/api/auth/user/${player.userId}`, {
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
          startTime: player.startTime || null,
          endTime: player.endTime || null,
          status: settlementStatus,
          role: playerRole,
          name: playerName,
          phoneNumber: playerPhoneNumber
        };
      }));

    } catch (error) {
      Logger.error('Error fetching event players', {
        event_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return res.status(500).json({
        success: false,
        code: 'FETCH_PLAYERS_ERROR',
        message: 'Failed to fetch event players',
        details: {
          event_id,
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
      shuttlecockCount: shuttlecockCount,
      penaltyFee: penaltyFee // Default penalty, could be configurable
    };

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
        const userResponse = await fetch(`http://localhost:3001/api/auth/user/${createdBy}`, {
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
    const settlements = calculator.calculateSettlements(players, courts, costs);
    const totalCollected = settlements.reduce((sum, s) => sum + s.totalAmount, 0);

    // Merge player data with settlement calculations
    const mergedPlayers = settlements.map((settlement) => {
      const player = players.find(p => p.playerId === settlement.playerId);

      Logger.info('Merging player data with settlement calculation', {
        playerId: settlement.playerId,
        playerName: player?.name,
        hasUserId: !!player?.userId
      });

      return {
        // Player info
        playerId: settlement.playerId,
        userId: player?.userId || null,
        startTime: player?.startTime || null,
        endTime: player?.endTime || null,
        status: player?.status || 'played',
        role: player?.role || 'guest',
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

    // Create settlement record in database
    const settlementId = `settlement_${Date.now()}_${uuidv4().split('-')[0]}`;

    const settlementRecord = new Settlement({
      settlementId,
      eventId: event_id,
      eventData: {
        courts,
        costs,
        currency
      },
      calculationResults: mergedPlayers,
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
        console.log('settlement >>>,', settlement);
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
              settlement_type: 'event_settlement',
              event_creator_phone: eventCreatorPhoneNumber || ''
            }
          };

          Logger.grpc('Issuing charge to Payment Service', {
            player_id: settlement.playerId,
            amount: settlement.totalAmount,
            currency
          });


          const paymentResponse = await paymentClient.issueCharges(chargeRequest);

          console.log('paymentResponse >>>', paymentResponse);

          // Update settlement record with payment info
          const playerIndex = settlementRecord.calculationResults.findIndex((p: any) => p.playerId === settlement.playerId);
          if (playerIndex >= 0) {
            settlementRecord.calculationResults[playerIndex].paymentId = paymentResponse.id;
            settlementRecord.calculationResults[playerIndex].paymentStatus = paymentResponse.status;
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

    res.status(201).json({
      success: true,
      data: {
        settlementId,
        event_id,
        calculationResults: settlementRecord.calculationResults,
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
        .select('settlementId eventId calculationResults'),
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

      return {
        settlementId: settlementObj.settlementId,
        eventId: settlementObj.eventId,
        calculationResults: settlementObj.calculationResults?.map((player: any) => ({
          playerDetails: {
            name: player.name,
            phoneNumber: player.phoneNumber
          },
          breakdown: {
            hoursPlayed: player.breakdown?.hoursPlayed,
            courtSessions: player.breakdown?.courtSessions?.map((session: any) => ({
              hour: session.hour,
              playersInSession: session.playersInSession,
              costPerPlayer: session.costPerPlayer
            })) || []
          },
          playerId: player.playerId,
          courtFee: player.courtFee,
          shuttlecockFee: player.shuttlecockFee,
          penaltyFee: player.penaltyFee,
          totalAmount: player.totalAmount
        })) || []
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

export const getSettlementById = async (req: Request, res: Response) => {
  try {
    const { settlement_id } = req.params;

    Logger.info('Get settlement by ID request received', { settlement_id });

    const settlement = await Settlement.findOne({
      settlementId: settlement_id
    }).select('settlementId eventId calculationResults');

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

    // Transform settlement to return only required fields
    const settlementObj = settlement.toObject();

    // Create clean response with only required fields
    const cleanSettlement = {
      settlementId: settlementObj.settlementId,
      eventId: settlementObj.eventId,
      calculationResults: settlementObj.calculationResults?.map((player: any) => ({
        playerDetails: {
          name: player.name,
          phoneNumber: player.phoneNumber
        },
        breakdown: {
          hoursPlayed: player.breakdown?.hoursPlayed,
          courtSessions: player.breakdown?.courtSessions?.map((session: any) => ({
            hour: session.hour,
            playersInSession: session.playersInSession,
            costPerPlayer: session.costPerPlayer
          })) || []
        },
        playerId: player.playerId,
        courtFee: player.courtFee,
        shuttlecockFee: player.shuttlecockFee,
        penaltyFee: player.penaltyFee,
        totalAmount: player.totalAmount
      })) || []
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