import * as amqp from 'amqplib';
import { Logger } from '../utils/logger';

let channelPromise: Promise<amqp.Channel> | null = null;

interface RabbitConfig {
  url: string;
  queue: string;
  prefetch: number;
  retryMs: number;
}

function getConfig(): RabbitConfig {
  return {
    url: process.env.RABBIT_URL || 'amqp://admin:password123@localhost:5672',
    queue: process.env.PAYMENT_ISSUE_QUEUE || 'payment.issue',
    prefetch: Number(process.env.RABBIT_PREFETCH || 1),
    retryMs: Number(process.env.RABBIT_RETRY_MS || 2000)
  };
}

async function connectChannel(): Promise<amqp.Channel> {
  const cfg = getConfig();
  Logger.info('Connecting RabbitMQ for payment-service consumer', { url: cfg.url, queue: cfg.queue });
  const conn = await amqp.connect(cfg.url);
  const ch = await conn.createChannel();
  await ch.assertQueue(cfg.queue, { durable: true });
  await ch.prefetch(cfg.prefetch);
  Logger.success('RabbitMQ channel ready (payment-service)', { queue: cfg.queue, prefetch: cfg.prefetch });

  // Graceful shutdown handlers
  const cleanup = async () => {
    try { await ch.close(); await conn.close(); } catch { /* ignore */ }
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return ch;
}

export async function rabbitChannel(): Promise<amqp.Channel> {
  if (!channelPromise) channelPromise = connectWithRetry();
  return channelPromise;
}

async function connectWithRetry(): Promise<amqp.Channel> {
  const cfg = getConfig();
  while (true) {
    try {
      return await connectChannel();
    } catch (err) {
      Logger.error('RabbitMQ connection failed (payment-service). Retrying...', err);
      await new Promise(r => setTimeout(r, cfg.retryMs));
    }
  }
}
