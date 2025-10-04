import * as amqp from 'amqplib';
import type { ConfirmChannel, Connection } from 'amqplib';
import { Logger } from '../utils/logger';

interface PublishConfig {
  url: string;
  createdQueue: string;
  completedQueue: string;
  retryMs: number;
}

function getConfig(): PublishConfig {
  return {
    url: process.env.RABBIT_URL || 'amqp://admin:password123@localhost:5672',
    createdQueue: process.env.PAYMENT_CREATED_QUEUE || 'payment.created',
    completedQueue: process.env.PAYMENT_COMPLETED_QUEUE || 'payment.completed',
    retryMs: Number(process.env.RABBIT_RETRY_MS || 2000)
  };
}

let connection: Connection | null = null;
let channel: ConfirmChannel | null = null;
let connecting = false;
let pending: Array<() => void> = [];

async function ensureChannel(): Promise<ConfirmChannel> {
  if (channel) return channel;
  if (connecting) {
    await new Promise<void>(resolve => pending.push(resolve));
    return channel!;
  }
  connecting = true;
  const cfg = getConfig();
  while (!channel) {
    try {
      Logger.info('Connecting RabbitMQ publisher (payment-service)', { url: cfg.url });
  connection = await amqp.connect(cfg.url) as unknown as Connection;
      connection.on('close', () => {
        Logger.warning('RabbitMQ publisher connection closed, will reconnect');
        channel = null; connection = null;
      });
      connection.on('error', (err: any) => {
        Logger.error('RabbitMQ publisher connection error', err);
      });
      // Some versions of amqplib typings may not include createConfirmChannel; fall back to createChannel
      const anyConn: any = connection;
      if (anyConn.createConfirmChannel) {
        channel = await anyConn.createConfirmChannel();
      } else {
        channel = await anyConn.createChannel();
      }
      await channel!.assertQueue(cfg.createdQueue, { durable: true });
      await channel!.assertQueue(cfg.completedQueue, { durable: true });
      Logger.success('RabbitMQ publisher channel ready', { createdQueue: cfg.createdQueue, completedQueue: cfg.completedQueue });
    } catch (err) {
      Logger.error('Failed to establish RabbitMQ publisher channel, retrying...', err);
      await new Promise(r => setTimeout(r, cfg.retryMs));
    }
  }
  connecting = false;
  pending.forEach(r => r());
  pending = [];
  return channel;
}

interface PaymentCreatedMessage {
  payment_id: string;
  event_id: string | null;
  player_id: string;
  amount: number;
  currency: string;
  qr_code_uri: string | null;
  payment_status: string;
  created_at: string;
}

interface PaymentCompletedMessage {
  payment_id: string;
  event_id: string | null;
  player_id: string;
  amount: number;
  currency: string;
  payment_status: string;
  updated_at: string;
}

async function publishTo(queue: string, payload: object): Promise<void> {
  try {
    const ch = await ensureChannel();
    const body = Buffer.from(JSON.stringify(payload));
    await new Promise<void>((resolve, reject) => {
      ch.sendToQueue(queue, body, { contentType: 'application/json', persistent: true, type: 'event', appId: 'payment-service', timestamp: Date.now() }, (err) => err ? reject(err) : resolve());
    });
    Logger.success('Published message', { queue, size: body.length });
  } catch (err) {
    Logger.error('Failed to publish message', { queue, error: err instanceof Error ? err.message : err });
  }
}

export async function publishPaymentCreatedEvent(msg: PaymentCreatedMessage): Promise<void> {
  const { createdQueue } = getConfig();
  Logger.info('Publishing payment.created event', { payment_id: msg.payment_id });
  await publishTo(createdQueue, msg);
}

export async function publishPaymentCompletedEvent(msg: PaymentCompletedMessage): Promise<void> {
  const { completedQueue } = getConfig();
  Logger.info('Publishing payment.completed event', { payment_id: msg.payment_id });
  await publishTo(completedQueue, msg);
}

// Graceful shutdown
async function shutdown() {
  try { if (channel) await channel.close(); } catch { /* ignore */ }
  try { if (connection) (connection as any).close && await (connection as any).close(); } catch { /* ignore */ }
  channel = null; connection = null;
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
