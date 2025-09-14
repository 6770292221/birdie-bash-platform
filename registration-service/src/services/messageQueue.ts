import amqp from 'amqplib';
import dotenv from 'dotenv';
import path from 'path';

// Load .env for this service regardless of import order
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
    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    this.url = process.env.RABBIT_URL || 'amqp://localhost';
    this.exchange = process.env.RABBIT_EXCHANGE || 'events';
    this.retryMs = Number(process.env.RABBIT_RETRY_MS || 2000);
    this.pending = [];
    this.autoBind = process.env.RABBIT_AUTOBIND === 'true' || (!isProd && (process.env.RABBIT_AUTOBIND ?? 'true') !== 'false');
    this.bindQueue = process.env.RABBIT_BIND_QUEUE || 'registrations.debug';
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
      console.log('🔧 RabbitMQ connect URL:', this.url);
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
        if (this.autoBind) {
          await this.channel.assertQueue(this.bindQueue, { durable: true });
          await this.channel.bindQueue(this.bindQueue, this.exchange, this.bindKey);
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
        service: 'registration-service'
      };

      const routingKey = `event.${eventType}`;

      if (this.logPayloads) {
        const raw = JSON.stringify(message);
        const size = Buffer.byteLength(raw, 'utf8');
        const truncated = size > this.maxLogBytes ? raw.slice(0, this.maxLogBytes) + `... [${size} bytes]` : raw;
        console.log('📝 Publishing message', { exchange: this.exchange, routingKey, size, payload: truncated });
      }

      await new Promise<void>((resolve, reject) => {
        this.channel!.publish(
          this.exchange,
          routingKey,
          Buffer.from(JSON.stringify(message)),
          { persistent: true, mandatory: true },
          (err: any) => (err ? reject(err) : resolve())
        );
      });

      console.log(`📤 Published event: ${eventType}`, { routingKey, data });
    } catch (error) {
      console.error('❌ Failed to publish message:', error);
      this.channel = null;
      this.pending.push({ type: eventType, data });
      this.scheduleReconnect();
    }
  }

  async publishParticipantJoined(eventData: {
    eventId: string;
    playerId: string;
    userId?: string;
    playerName?: string;
    playerEmail?: string;
    status: 'registered' | 'waitlist';
  }): Promise<void> {
    const eventType = eventData.status === 'registered' ? 'participant.joined' : 'waiting.added';
    await this.publishEvent(eventType, eventData);
  }

  private async selfHealBindAndRetry(exchange: string, routingKey: string, rawContent: Buffer) {
    try {
      if (!this.channel) return;
      console.warn('🧩 Attempting auto-bind and retry once for returned message', { exchange, routingKey, queue: this.bindQueue, binding: this.bindKey });
      await this.channel.assertQueue(this.bindQueue, { durable: true });
      await this.channel.bindQueue(this.bindQueue, exchange, this.bindKey);
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
