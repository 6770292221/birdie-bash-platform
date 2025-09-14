import amqp from 'amqplib';
import dotenv from 'dotenv';
import path from 'path';
import Event from '../models/Event';

// Ensure .env is loaded before reading process.env
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

class MessageQueueService {
  private connection: any = null;
  private channel: any = null;
  private readonly url: string;
  private readonly exchange: string;
  private readonly retryMs: number;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pending: Array<{ type: string; data: any }>;
  private readonly autoBind: boolean;
  private readonly bindQueue: string;
  private readonly bindKey: string;
  private readonly logPayloads: boolean;
  private readonly maxLogBytes: number;
  private readonly autoBindOnReturn: boolean;
  private didAutoBindOnce: boolean = false;

  constructor() {
    this.url = process.env.RABBIT_URL || 'amqp://localhost';
    this.exchange = process.env.RABBIT_EXCHANGE || 'events';
    this.retryMs = Number(process.env.RABBIT_RETRY_MS || 2000);
    this.pending = [];
    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    this.autoBind = process.env.RABBIT_AUTOBIND === 'true' || (!isProd && (process.env.RABBIT_AUTOBIND ?? 'true') !== 'false');
    this.bindQueue = process.env.RABBIT_BIND_QUEUE || 'events.debug';
    this.bindKey = process.env.RABBIT_BIND_KEY || 'event.#';
    this.logPayloads = process.env.RABBIT_LOG_PAYLOADS === 'true' || (!isProd && (process.env.RABBIT_LOG_PAYLOADS ?? 'true') !== 'false');
    this.maxLogBytes = Number(process.env.RABBIT_MAX_LOG_BYTES || 2048);
    this.autoBindOnReturn = process.env.RABBIT_AUTOBIND_ON_RETURN === 'true' || (!isProd && (process.env.RABBIT_AUTOBIND_ON_RETURN ?? 'true') !== 'false');
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, this.retryMs);
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.connection.on('close', () => {
        console.warn('⚠️ RabbitMQ connection closed. Reconnecting...');
        this.channel = null;
        this.scheduleReconnect();
      });
      this.connection.on('error', (err: any) => {
        console.error('❌ RabbitMQ connection error:', err?.message || err);
        this.channel = null;
      });

      this.channel = await this.connection.createConfirmChannel();

      if (this.channel) {
        await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
        // Always bind notification queue regardless of autoBind flag
        {
          const notifyQueue = process.env.RABBIT_NOTIFY_QUEUE || 'events.notification';
          const notifyKeys = (process.env.RABBIT_NOTIFY_BIND_KEY || 'event.created')
            .split(',')
            .map(k => k.trim())
            .filter(Boolean);
          await this.channel.assertQueue(notifyQueue, { durable: true });
          for (const key of notifyKeys) {
            await this.channel.bindQueue(notifyQueue, this.exchange, key);
          }
          console.log('🔗 Notification queue bound', { queue: notifyQueue, keys: notifyKeys });
        }
        if (this.autoBind) {
          await this.channel.assertQueue(this.bindQueue, { durable: true });
          const keys = new Set<string>((this.bindKey || '').split(',').map(k => k.trim()).filter(Boolean));
          if (keys.size === 0) {
            keys.add('event.participant.joined');
            keys.add('event.participant.cancelled');
          }
          for (const key of keys) {
            await this.channel.bindQueue(this.bindQueue, this.exchange, key);
          }
          console.log('🔗 Bind queue configured', { queue: this.bindQueue, keys: Array.from(keys) });
          const enableInternal = String(process.env.RABBIT_ENABLE_INTERNAL_CONSUMER || '').toLowerCase() === 'true';
          if (enableInternal) {
            await this.channel.consume(
              this.bindQueue,
              async (msg: any) => {
                if (!msg) return;
                try {
                  const routingKey: string = msg.fields?.routingKey || '';
                  const content = msg.content?.toString('utf8') || '{}';
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
                    }
                  }
                  this.channel!.ack(msg);
                } catch (e) {
                  console.error('❌ Failed to process message:', e);
                  this.channel!.nack(msg, false, false);
                }
              },
              { noAck: false }
            );
          }
        }
        this.channel.on('return', (msg: any) => {
          try {
            const payload = msg.content?.toString('utf8');
            const info = {
              exchange: msg.fields?.exchange,
              routingKey: msg.fields?.routingKey,
              replyCode: msg.fields?.replyCode,
              replyText: msg.fields?.replyText,
            };
            console.warn('↩️  Message returned (unroutable)', { ...info, payload });
            if (this.autoBindOnReturn && !this.didAutoBindOnce) {
              this.didAutoBindOnce = true;
              void this.selfHealBindAndRetry(info.exchange as string, info.routingKey as string, msg.content as Buffer);
            }
          } catch (_e) {
            console.warn('↩️  Message returned (unroutable)');
          }
        });
      }

      // Masked URL log
      try {
        const u = new URL(this.url);
        console.log('📨 RabbitMQ connected and exchange created', {
          host: u.hostname,
          vhost: decodeURIComponent(u.pathname || '/'),
          exchange: this.exchange,
          ...(this.autoBind ? { queue: this.bindQueue, binding: this.bindKey } : {}),
        });
      } catch {
        console.log('📨 RabbitMQ connected and exchange created');
      }

      if (this.pending.length) {
        const toSend = [...this.pending];
        this.pending = [];
        for (const msg of toSend) {
          await this.publishEvent(msg.type, msg.data);
        }
      }
    } catch (error) {
      console.error('❌ RabbitMQ connection failed:', error);
      this.scheduleReconnect();
    }
  }

  async publishEvent(eventType: string, data: any): Promise<void> {
    if (!this.channel) {
      this.pending.push({ type: eventType, data });
      console.warn('⚠️ RabbitMQ channel not available, queued message', { eventType });
      this.scheduleReconnect();
      return;
    }

    try {
      const message = {
        eventType,
        data,
        timestamp: new Date().toISOString(),
        service: 'event-service'
      };
      const routingKey = `event.${eventType}`;
      if (this.logPayloads) {
        const raw = JSON.stringify(message);
        const size = Buffer.byteLength(raw, 'utf8');
        const truncated = size > this.maxLogBytes ? raw.slice(0, this.maxLogBytes) + `... [${size} bytes]` : raw;
        console.log('📝 Publishing message', { exchange: this.exchange, routingKey, size, payload: truncated });
      }
      await new Promise<void>((resolve, reject) => {
        this.channel!.publish(this.exchange, routingKey, Buffer.from(JSON.stringify(message)), { persistent: true, mandatory: true }, (err: any) => (err ? reject(err) : resolve()));
      });
      console.log(`📤 Published event: ${eventType}`, { routingKey, data });
    } catch (error) {
      console.error('❌ Failed to publish message:', error);
      this.channel = null;
      this.pending.push({ type: eventType, data });
      this.scheduleReconnect();
    }
  }

  private async selfHealBindAndRetry(exchange: string, routingKey: string, rawContent: Buffer) {
    try {
      if (!this.channel) return;
      console.warn('🧩 Attempting auto-bind and retry once for returned message', { exchange, routingKey, queue: this.bindQueue, binding: this.bindKey });
      // Ensure main bind queue is present and bound
      await this.channel.assertQueue(this.bindQueue, { durable: true });
      await this.channel.bindQueue(this.bindQueue, exchange, this.bindKey);
      // Ensure notification queue is also bound (covers event.updated/deleted)
      try {
        const notifyQueue = process.env.RABBIT_NOTIFY_QUEUE || 'events.notification';
        const notifyKeys = (process.env.RABBIT_NOTIFY_BIND_KEY || 'event.created')
          .split(',')
          .map(k => k.trim())
          .filter(Boolean);
        await this.channel.assertQueue(notifyQueue, { durable: true });
        for (const key of notifyKeys) {
          await this.channel.bindQueue(notifyQueue, exchange, key);
        }
        console.log('🔗 Self-heal: notification queue bound', { queue: notifyQueue, keys: notifyKeys });
      } catch (e) {
        console.warn('Self-heal: notification bind failed (non-fatal)', e);
      }
      await new Promise<void>((resolve, reject) => {
        this.channel!.publish(exchange, routingKey, rawContent, { persistent: true, mandatory: true }, (err: any) => (err ? reject(err) : resolve()));
      });
      console.log('🔁 Retried publish after auto-bind', { exchange, routingKey });
    } catch (e) {
      console.error('❌ Auto-bind retry failed:', e);
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      console.log('📨 RabbitMQ connection closed');
    } catch (error) {
      console.error('❌ Error closing RabbitMQ connection:', error);
    }
  }
}

const messageQueueService = new MessageQueueService();
messageQueueService.connect().catch(error => {
  console.error('Failed to initialize RabbitMQ connection:', error);
});

process.on('SIGINT', async () => {
  await messageQueueService.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await messageQueueService.close();
  process.exit(0);
});

export default messageQueueService;
