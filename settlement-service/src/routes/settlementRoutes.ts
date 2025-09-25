import { Router } from 'express';
import {
  calculateAndCharge,
  getAllSettlements,
  getSettlementById
} from '../controllers/settlementController';

const router = Router();

/**
 * @swagger
 * /api/settlements:
 *   get:
 *     summary: Get all settlements with pagination and filters
 *     description: Retrieves all settlements with optional filtering and pagination
 *     tags: [Settlements]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: event_id
 *         schema:
 *           type: string
 *         description: Filter by event ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, refunded, partially_refunded, cancelled]
 *         description: Filter by settlement status
 *     responses:
 *       200:
 *         description: Settlements retrieved successfully
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
 *                           settlementId:
 *                             type: string
 *                           eventId:
 *                             type: string
 *                           eventData:
 *                             type: object
 *                           calculationResults:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 playerId:
 *                                   type: string
 *                                 courtFee:
 *                                   type: number
 *                                 shuttlecockFee:
 *                                   type: number
 *                                 penaltyFee:
 *                                   type: number
 *                                 totalAmount:
 *                                   type: number
 *                                 paymentId:
 *                                   type: string
 *                                 paymentStatus:
 *                                   type: string
 *                           totalCollected:
 *                             type: number
 *                           successfulCharges:
 *                             type: number
 *                           failedCharges:
 *                             type: number
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to retrieve settlements
 */
router.get('/', getAllSettlements);

/**
 * @swagger
 * /api/settlements/{settlement_id}:
 *   get:
 *     summary: Get settlement by ID
 *     description: Retrieves a specific settlement by its ID
 *     tags: [Settlements]
 *     parameters:
 *       - in: path
 *         name: settlement_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Settlement ID or MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Settlement retrieved successfully
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
 *                     settlement:
 *                       type: object
 *                       properties:
 *                         settlementId:
 *                           type: string
 *                         eventId:
 *                           type: string
 *                         eventData:
 *                           type: object
 *                           description: Original calculation input data
 *                         calculationResults:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               playerId:
 *                                 type: string
 *                               courtFee:
 *                                 type: number
 *                               shuttlecockFee:
 *                                 type: number
 *                               penaltyFee:
 *                                 type: number
 *                               totalAmount:
 *                                 type: number
 *                               paymentId:
 *                                 type: string
 *                               paymentStatus:
 *                                 type: string
 *                               breakdown:
 *                                 type: object
 *                         totalCollected:
 *                           type: number
 *                         successfulCharges:
 *                           type: number
 *                         failedCharges:
 *                           type: number
 *                         status:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                 message:
 *                   type: string
 *       404:
 *         description: Settlement not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: "SETTLEMENT_NOT_FOUND"
 *                 message:
 *                   type: string
 *                   example: "Settlement not found"
 *                 details:
 *                   type: object
 *       500:
 *         description: Failed to retrieve settlement
 */
router.get('/:settlement_id', getSettlementById);



/**
 * @swagger
 * /api/settlements/issue:
 *   post:
 *     summary: Calculate settlements and issue charges to Payment Service (Auto-fetch event data)
 *     description: |
 *       Automatically fetches event details and participants, then calculates settlement amounts and issues charges via gRPC to Payment Service.
 *
 *       **Data Sources:**
 *       - Event details from Event Service (port 3003)
 *       - Players/participants from Registration Service (port 3005)
 *       - Court and cost information from event configuration
 *
 *       **Automatic Actions:**
 *       - Updates event status to "completed" after successful settlement
 *     tags: [Settlements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event_id]
 *             properties:
 *               event_id:
 *                 type: string
 *                 description: Event ID for the settlement - all other data will be fetched automatically
 *                 example: "68caed4a19d4dfc0aaba9de9"
 *               currency:
 *                 type: string
 *                 description: Currency code
 *                 default: "THB"
 *                 example: "THB"
 *               shuttlecockCount:
 *                 type: number
 *                 description: Number of shuttlecocks used (optional, defaults from event if not provided)
 *                 example: 4
 *               penaltyFee:
 *                 type: number
 *                 description: Penalty fee amount (optional, defaults from event if not provided)
 *                 example: 10000
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
router.post('/issue', calculateAndCharge);

export default router;

//  ช่วยเพิ่ม get เพื่อดู settlement ให้หน่อยได้มั้ย ขอแบบ getall กับ getbyId 