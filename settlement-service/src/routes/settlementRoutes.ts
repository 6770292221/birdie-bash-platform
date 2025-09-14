import { Router } from 'express';
import {
  issueCharges,
  confirmPayment,
  refundPayment,
  getPaymentStatus,
  getPlayerPayments,
  calculateSettlements,
  calculateAndCharge
} from '../controllers/settlementController';

const router = Router();

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
router.post('/charges', issueCharges);

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
router.put('/:settlement_id/confirm', confirmPayment);

/**
 * POST /api/settlements/:settlement_id/refund
 * Refund a settlement payment
 */
router.post('/:settlement_id/refund', refundPayment);

/**
 * GET /api/settlements/:settlement_id/status
 * Get settlement status
 */
router.get('/:settlement_id/status', getPaymentStatus);

/**
 * GET /api/settlements/player/:player_id
 * Get settlements for a specific player
 */
router.get('/player/:player_id', getPlayerPayments);

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
router.post('/calculate', calculateSettlements);

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
router.post('/calculate-and-charge', calculateAndCharge);

export default router;