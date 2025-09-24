import amqp from 'amqplib';
import dotenv from 'dotenv';
import path from 'path';
import Player from '../models/Player';
import messageQueueService from '../queue/publisher';
import { EVENTS } from '../queue/events';
import { connectRegistrationDB } from '../config/registrationDatabase';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

// Allow disabling via ENV toggle
if (String(process.env.ENABLE_WAITLIST_WORKER || 'true').toLowerCase() === 'false') {
  console.log('⏸️  Waitlist Promoter disabled by ENV (ENABLE_WAITLIST_WORKER=false)');
  process.exit(0);
}

async function promoteOne(eventId: string): Promise<boolean> {
  const waitlistPlayer = await Player.findOne({ eventId, status: 'waitlist' }).sort({ registrationTime: 1 });
  if (!waitlistPlayer) return false;
  waitlistPlayer.status = 'registered';
  await waitlistPlayer.save();
  try {
    await messageQueueService.publishEvent(EVENTS.WAITLIST_PROMOTED, {
      eventId,
      playerId: waitlistPlayer.id,
      userId: waitlistPlayer.userId || undefined,
      playerName: waitlistPlayer.name,
      playerEmail: waitlistPlayer.email,
      status: 'registered',
      promotedFromWaitlist: true,
      promotedAt: new Date().toISOString(),
    });
    console.log('📤 Published waitlist.promoted', { eventId, playerId: waitlistPlayer.id });
  } catch (e) {
    console.error('❌ Failed to publish waitlist.promoted:', e);
  }
  return true;
}

async function main() {
  await connectRegistrationDB();

  const url = process.env.RABBIT_URL || 'amqp://localhost';
  const exchange = process.env.RABBIT_EXCHANGE || 'events';
  const queue = process.env.RABBIT_WAITLIST_QUEUE || 'events.waitlist.promoter';
  const delayMs = Number(process.env.RABBIT_CONSUMER_DELAY_MS || 0); // optional artificial delay before ack
  const prefetch = Math.max(1, Number(process.env.RABBIT_PREFETCH || 1));
  console.log('Waitlist Promoter - Connecting RabbitMQ', { url, exchange, queue });

  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();
  await ch.assertExchange(exchange, 'topic', { durable: true });
  await ch.assertQueue(queue, { durable: true, autoDelete: false, exclusive: false });
  await ch.bindQueue(queue, exchange, 'event.capacity.slot.opened');
  await ch.prefetch(prefetch);

  console.log('Waitlist Promoter - Consuming', { queue, bindKeys: ['event.capacity.slot.opened'] });
  ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const routingKey = (msg.fields as any)?.routingKey || '';
      const content = msg.content.toString('utf8') || '{}';
      const payload = JSON.parse(content);
      const data = payload?.data || {};
      const eventId: string = data.eventId;
      const openedSlots = Math.max(1, Number(data.openedSlots || 1));
      console.log('🔔 Received', { routingKey, eventId, openedSlots });

      let promoted = 0;
      for (let i = 0; i < openedSlots; i++) {
        const ok = await promoteOne(eventId);
        if (!ok) break;
        promoted += 1;
      }

      console.log('✅ Promotion handled', { eventId, requested: openedSlots, promoted });
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      ch.ack(msg);
    } catch (e) {
      console.error('❌ Waitlist Promoter - Failed:', e);
      ch.nack(msg, false, false);
    }
  });

  process.on('SIGINT', async () => { await ch.close(); await conn.close(); process.exit(0); });
  process.on('SIGTERM', async () => { await ch.close(); await conn.close(); process.exit(0); });
}

main().catch((err) => {
  console.error('Waitlist Promoter failed:', err);
  process.exit(1);
});
