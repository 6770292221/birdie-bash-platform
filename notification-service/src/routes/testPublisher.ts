import { Router } from 'express';
import { publish } from '../config/rabbit';
import { env } from '../config/env';

const router = Router();

/**
 * @openapi
 * /test/publish:
 *   post:
 *     summary: Publish a test notification event to RabbitMQ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationEvent'
 *     responses:
 *       202:
 *         description: Published
 */
router.post('/publish', async (req, res) => {
  const body = req.body;
  await publish(env.routingKey, body);
  return res.status(202).json({ published: true });
});

export default router;
