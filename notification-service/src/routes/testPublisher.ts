import { Router } from 'express';
import { publish } from '../config/rabbit';
import { env } from '../config/env';

const router = Router();
router.post('/publish', async (req, res) => {
  const body = req.body;
  await publish(env.routingKey, body);
  return res.status(202).json({ published: true });
});
export default router;
