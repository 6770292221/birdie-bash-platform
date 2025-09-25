import amqp from 'amqplib';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import Event from '../models/Event';
import { EventStatus } from '../types/event';

// Load env regardless of CWD
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

// Allow disabling via ENV toggle
if (String(process.env.ENABLE_CAPACITY_WORKER || 'true').toLowerCase() === 'false') {
  console.log('⏸️  Capacity Worker disabled by ENV (ENABLE_CAPACITY_WORKER=false)');
  process.exit(0);
}

async function connectMongo() {
  const uri = process.env.EVENT_DB_URI || 'mongodb://localhost:27017/birdie_events';
  await mongoose.connect(uri);
  console.log('Capacity Worker - MongoDB Connected');
}

async function main() {
  await connectMongo();

  const url = process.env.RABBIT_URL || 'amqp://localhost';
  const exchange = process.env.RABBIT_EXCHANGE || 'events';
  const baseQueue = process.env.RABBIT_CAPACITY_QUEUE || 'events.capacity.worker';
  const queueMode = (process.env.RABBIT_CAPACITY_QUEUE_MODE || 'single').toLowerCase(); // 'single' | 'ephemeral'
  const queue = queueMode === 'ephemeral' ? `${baseQueue}.${process.pid}` : baseQueue;
  const delayMs = Number(process.env.RABBIT_CONSUMER_DELAY_MS || 0); // optional artificial delay before ack
  const prefetch = Math.max(1, Number(process.env.RABBIT_PREFETCH || 1));
  const bindKeys = (process.env.RABBIT_BIND_KEY || 'event.participant.joined,event.participant.cancelled')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  console.log('Capacity Worker - Connecting RabbitMQ', { url, exchange, queue, bindKeys, queueMode });
  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();
  await ch.assertExchange(exchange, 'topic', { durable: true });
  if (queueMode === 'ephemeral') {
    await ch.assertQueue(queue, { durable: false, autoDelete: true, exclusive: true });
  } else {
    await ch.assertQueue(queue, { durable: true, autoDelete: false, exclusive: false });
  }
  for (const key of bindKeys) {
    await ch.bindQueue(queue, exchange, key);
  }
  // Process messages sequentially to keep capacity updates consistent
  await ch.prefetch(prefetch);

  console.log('Capacity Worker - Consuming', { queue, bindKeys });
  ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const routingKey = (msg.fields as any)?.routingKey || '';
      const content = msg.content.toString('utf8') || '{}';
      const payload = JSON.parse(content);
      const data = payload?.data || {};

      console.log('🔔 Received message', { routingKey, service: payload?.service });

      if (routingKey.endsWith('participant.joined')) {
        if (data?.eventId && data?.status === 'registered') {
          await Event.findByIdAndUpdate(data.eventId, {
            $inc: {
              'capacity.currentParticipants': 1,
              'capacity.availableSlots': -1,
            },
          }).catch(() => {});
          console.log('✅ capacity updated (joined)', { eventId: data.eventId });
        }
      } else if (routingKey.endsWith('participant.cancelled')) {
        if (data?.eventId && data?.wasRegistered) {
          // Read capacity before
          const before = await Event.findById(data.eventId, 'status capacity.availableSlots capacity.waitlistEnabled').lean().catch(() => null) as any;
          const beforeAvail = Number(before?.capacity?.availableSlots ?? 0);

          await Event.findByIdAndUpdate(data.eventId, {
            $inc: {
              'capacity.currentParticipants': -1,
              'capacity.availableSlots': 1,
            },
          }).catch(() => {});
          console.log('✅ capacity updated (cancelled)', { eventId: data.eventId });

          // Check if this cancellation opens slots from 0 -> >0 and waitlist is enabled
          const after = await Event.findById(data.eventId, 'status capacity.availableSlots capacity.waitlistEnabled').lean().catch(() => null) as any;
          const afterAvail = Number(after?.capacity?.availableSlots ?? 0);
          const waitlistEnabled = Boolean(after?.capacity?.waitlistEnabled);
          const isActive = String(after?.status || EventStatus.UPCOMING) === EventStatus.UPCOMING || String(after?.status) === EventStatus.IN_PROGRESS;
          if (isActive && waitlistEnabled && beforeAvail <= 0 && afterAvail > 0) {
            const openedSlots = Math.max(1, Math.min(afterAvail, 1));
            const openedPayload = {
              eventType: 'capacity.slot.opened',
              data: { eventId: data.eventId, openedSlots },
              timestamp: new Date().toISOString(),
              service: 'event-service'
            };
            ch.publish(exchange, 'event.capacity.slot.opened', Buffer.from(JSON.stringify(openedPayload)), {
              persistent: true,
              contentType: 'application/json',
              appId: 'event-service',
              type: 'capacity.slot.opened',
              timestamp: Date.now(),
            });
            console.log('📤 Published event.capacity.slot.opened', { eventId: data.eventId, openedSlots });
          }
        } else {
          console.log('⚠️ Skipping capacity update/promotion - wasRegistered:', data?.wasRegistered);
        }
      } else if (routingKey.endsWith('waitlist.promoted')) {
        console.log('🎉 Processing waitlist promotion', { eventId: data.eventId, playerId: data.playerId });
        if (data?.eventId && data?.status === 'registered') {
          await Event.findByIdAndUpdate(data.eventId, {
            $inc: {
              'capacity.currentParticipants': 1,
              'capacity.availableSlots': -1,
            },
          }).catch(() => {});
          console.log('✅ capacity updated (waitlist promoted)', { eventId: data.eventId });
        }
      }

      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      ch.ack(msg);
    } catch (e) {
      console.error('❌ Capacity Worker - Failed to process message:', e);
      ch.nack(msg, false, false);
    }
  });

  process.on('SIGINT', async () => {
    await ch.close();
    await conn.close();
    await mongoose.connection.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Capacity Worker failed:', err);
  process.exit(1);
});
