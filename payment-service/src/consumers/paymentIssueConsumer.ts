import { rabbitChannel } from '../config/rabbit';
import { issueCharge } from '../services/paymentService';
import { Logger } from '../utils/logger';
import type { ConsumeMessage } from 'amqplib';

export async function startPaymentIssueConsumer() {
  if (String(process.env.ENABLE_PAYMENT_ISSUE_CONSUMER || 'true').toLowerCase() === 'false') {
    Logger.info('Payment Issue Consumer disabled via ENV');
    return;
  }

  const queue = process.env.PAYMENT_ISSUE_QUEUE || 'payment.issue';
  const ch = await rabbitChannel();
  Logger.server('Consuming payment issues queue', { queue });

  await ch.consume(queue, async (msg: ConsumeMessage | null) => {
    if (!msg) return;
    const raw = msg.content.toString('utf8');
    try {
      const payload = JSON.parse(raw);
      Logger.grpc('Payment issue message received', payload);
      const result = await issueCharge({
        player_id: payload.player_id,
        amount: payload.amount,
        event_id: payload.event_id,
        currency: payload.currency,
        payment_method: payload.payment_method,
        description: payload.description
      });
      Logger.success('Payment issue processed', { payment_id: result.id, status: result.status });
      ch.ack(msg);
    } catch (err) {
      Logger.error('Failed to process payment issue message', { error: err instanceof Error ? err.message : err, raw });
      // Do not requeue to avoid poison message loops; could add DLX later
      ch.nack(msg, false, false);
    }
  }, { noAck: false });
}
