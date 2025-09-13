import amqp from 'amqplib';

class MessageQueueService {
  private connection: any = null;
  private channel: any = null;
  private readonly url: string;
  private readonly exchange: string;
  private readonly retryMs: number;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pending: Array<{ type: string; data: any }>; // buffer when channel unavailable
  private readonly autoBind: boolean;
  private readonly bindQueue: string;
  private readonly bindKey: string;
  private readonly logPayloads: boolean;
  private readonly maxLogBytes: number;

  constructor() {
    this.url = process.env.RABBIT_URL || 'amqp://localhost';
    this.exchange = process.env.RABBIT_EXCHANGE || 'events';
    this.retryMs = Number(process.env.RABBIT_RETRY_MS || 2000);
    this.pending = [];
    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    // In production, default to no auto-binding unless explicitly enabled.
    // In non-production, default to auto-bind unless explicitly disabled.
    this.autoBind = process.env.RABBIT_AUTOBIND === 'true' || (!isProd && (process.env.RABBIT_AUTOBIND ?? 'true') !== 'false');
    this.bindQueue = process.env.RABBIT_BIND_QUEUE || 'events.debug';
    this.bindKey = process.env.RABBIT_BIND_KEY || 'event.#';
    // Log payloads: default true in non-prod, false in prod unless explicitly enabled
    this.logPayloads = process.env.RABBIT_LOG_PAYLOADS === 'true' || (!isProd && (process.env.RABBIT_LOG_PAYLOADS ?? 'true') !== 'false');
    this.maxLogBytes = Number(process.env.RABBIT_MAX_LOG_BYTES || 2048);
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

      // Use confirm channel to ensure broker ack
      this.channel = await this.connection.createConfirmChannel();

      if (this.channel) {
        await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
        if (this.autoBind) {
          await this.channel.assertQueue(this.bindQueue, { durable: true });
          await this.channel.bindQueue(this.bindQueue, this.exchange, this.bindKey);
        }
        // Log returned (unroutable) messages when publishing with mandatory: true
        this.channel.on('return', (msg: any) => {
          try {
            const payload = msg.content?.toString('utf8');
            console.warn('↩️  Message returned (unroutable)', {
              exchange: msg.fields?.exchange,
              routingKey: msg.fields?.routingKey,
              replyCode: msg.fields?.replyCode,
              replyText: msg.fields?.replyText,
              payload,
            });
          } catch (_e) {
            console.warn('↩️  Message returned (unroutable)');
          }
        });
      }

      // Mask credentials when logging URL
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

      // Flush any pending messages
      if (this.pending.length) {
        const toSend = [...this.pending];
        this.pending = [];
        for (const msg of toSend) {
          await this.publishEvent(msg.type, msg.data);
        }
      }
    } catch (error) {
      console.error('❌ RabbitMQ connection failed:', error);
      // Schedule reconnect without throwing
      this.scheduleReconnect();
    }
  }

  async publishEvent(eventType: string, data: any): Promise<void> {
    if (!this.channel) {
      // Buffer and try later
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

      // Optional verbose log about what will be published
      if (this.logPayloads) {
        const raw = JSON.stringify(message);
        const size = Buffer.byteLength(raw, 'utf8');
        const truncated = size > this.maxLogBytes ? raw.slice(0, this.maxLogBytes) + `... [${size} bytes]` : raw;
        console.log('📝 Publishing message', {
          exchange: this.exchange,
          routingKey,
          size,
          payload: truncated,
        });
      }

      await new Promise<void>((resolve, reject) => {
        this.channel.publish(
          this.exchange,
          routingKey,
          Buffer.from(JSON.stringify(message)),
          { persistent: true, mandatory: true },
          (err: any, ok: any) => (err ? reject(err) : resolve())
        );
      });

      console.log(`📤 Published event: ${eventType}`, { routingKey, data });
    } catch (error) {
      console.error('❌ Failed to publish message:', error);
      // Attempt to reconnect and buffer message for retry
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
    const eventType = eventData.status === 'registered'
      ? 'participant.joined'
      : 'waiting.added';

    await this.publishEvent(eventType, eventData);
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log('📨 RabbitMQ connection closed');
    } catch (error) {
      console.error('❌ Error closing RabbitMQ connection:', error);
    }
  }
}

// Singleton instance
const messageQueueService = new MessageQueueService();

// Initialize connection (non-blocking + auto-retry)
messageQueueService.connect().catch(error => {
  console.error('Failed to initialize RabbitMQ connection:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await messageQueueService.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await messageQueueService.close();
  process.exit(0);
});

export default messageQueueService;
