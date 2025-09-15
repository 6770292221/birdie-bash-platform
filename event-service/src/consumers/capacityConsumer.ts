import amqp from 'amqplib';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import http from 'http';
import https from 'https';
import Event from '../models/Event';

// Load env regardless of CWD
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

async function connectMongo() {
  const uri = process.env.EVENT_DB_URI || 'mongodb://localhost:27017/birdie_events';
  await mongoose.connect(uri);
  console.log('Capacity Worker - MongoDB Connected');
}

async function promoteFromWaitlist(eventId: string): Promise<void> {
  const registrationServiceUrl = process.env.REGISTRATION_SERVICE_URL || 'http://localhost:3005';
  const target = new URL(`/api/registration/events/${eventId}/promote-waitlist`, registrationServiceUrl);
  const lib = target.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        method: 'POST',
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: target.pathname,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 200 && status < 300) {
          console.log('✅ Waitlist promotion triggered', { eventId });
          resolve();
        } else {
          console.log('⚠️ Waitlist promotion failed', { eventId, status });
          resolve(); // Don't fail the whole process
        }
      }
    );

    req.on('error', (err) => {
      console.error('❌ Failed to call waitlist promotion:', err.message);
      resolve(); // Don't fail the whole process
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('❌ Waitlist promotion timeout');
      resolve();
    });

    req.end();
  });
}

async function main() {
  await connectMongo();

  const url = process.env.RABBIT_URL || 'amqp://localhost';
  const exchange = process.env.RABBIT_EXCHANGE || 'events';
  const queue = process.env.RABBIT_BIND_QUEUE || 'events.capacity.worker';
  const bindKeys = (process.env.RABBIT_BIND_KEY || 'event.participant.joined,event.participant.cancelled')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  console.log('Capacity Worker - Connecting RabbitMQ', { url, exchange, queue, bindKeys });
  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();
  await ch.assertExchange(exchange, 'topic', { durable: true });
  await ch.assertQueue(queue, { durable: true });
  for (const key of bindKeys) {
    await ch.bindQueue(queue, exchange, key);
  }
  await ch.prefetch(10);

  console.log('Capacity Worker - Consuming', { queue, bindKeys });
  ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const routingKey = (msg.fields as any)?.routingKey || '';
      const content = msg.content.toString('utf8') || '{}';
      const payload = JSON.parse(content);
      const data = payload?.data || {};

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
          await Event.findByIdAndUpdate(data.eventId, {
            $inc: {
              'capacity.currentParticipants': -1,
              'capacity.availableSlots': 1,
            },
          }).catch(() => {});
          console.log('✅ capacity updated (cancelled)', { eventId: data.eventId });

          // Try to promote from waitlist
          await promoteFromWaitlist(data.eventId);
        }
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
