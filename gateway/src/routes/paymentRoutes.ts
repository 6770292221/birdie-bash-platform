import { Express } from 'express';
import { requireAuth } from '../middleware/auth';
import { getPlayerPayments, getEventPayments } from '../controllers/paymentController';

// Registers payment related REST routes backed by gRPC PaymentService.
export function registerPaymentRoutes(app: Express) {
  /**
   * @swagger
   * /api/payments/player/{playerId}:
   *   get:
   *     summary: Get payments for a player
   *     tags: [Payments]
   *     parameters:
   *       - in: path
   *         name: playerId
   *         schema:
   *           type: string
   *         required: true
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [0,1,2,3,4]
   *           description: Numeric enum of PaymentStatus (0=PENDING,...)
   *       - in: query
   *         name: eventId
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of payments
   */
  app.get('/api/payments/player/:playerId', requireAuth as any, getPlayerPayments as any);

  /**
   * @swagger
   * /api/payments/event/{eventId}:
   *   get:
   *     summary: Get payments for an event
   *     tags: [Payments]
   *     parameters:
   *       - in: path
   *         name: eventId
   *         schema:
   *           type: string
   *         required: true
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [0,1,2,3,4]
   *     responses:
   *       200:
   *         description: Event payments aggregated by player
   */
  app.get('/api/payments/event/:eventId', requireAuth as any, getEventPayments as any);
}
