import * as amqp from 'amqplib/callback_api';
import { Logger } from '../utils/logger';

export interface PaymentChargeMessage {
  player_id: string;
  amount: number;
  currency: string;
  event_id: string;
  description: string;
  metadata: {
    court_fee: string;
    shuttlecock_fee: string;
    penalty_fee: string;
    hours_played: string;
    settlement_type: string;
    event_creator_phone: string;
  };
}

export class RabbitMQPublisher {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private rabbitUrl: string;
  private exchange: string;
  private logPayloads: boolean;
  private maxLogBytes: number;
  private retryMs: number;

  constructor() {
    this.rabbitUrl = process.env.RABBIT_URL || 'amqp://admin:password123@localhost:5672';
    this.exchange = process.env.RABBIT_EXCHANGE || 'events';
    this.logPayloads = process.env.RABBIT_LOG_PAYLOADS === 'true';
    this.maxLogBytes = parseInt(process.env.RABBIT_MAX_LOG_BYTES || '2048');
    this.retryMs = parseInt(process.env.RABBIT_RETRY_MS || '2000');
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.connection && this.channel) {
          resolve(); // Already connected
          return;
        }

        Logger.info('Connecting to RabbitMQ', {
          url: this.rabbitUrl.replace(/\/\/.*@/, '//***:***@'), // Hide credentials in logs
          exchange: this.exchange
        });

        amqp.connect(this.rabbitUrl, (error0, connection) => {
          if (error0) {
            Logger.error('Failed to connect to RabbitMQ', error0);
            reject(error0);
            return;
          }

          this.connection = connection;

          connection.createChannel((error1, channel) => {
            if (error1) {
              Logger.error('Failed to create channel', error1);
              reject(error1);
              return;
            }

            this.channel = channel;

            // Declare exchange
            channel.assertExchange(this.exchange, 'topic', {
              durable: true
            }, (error2) => {
              if (error2) {
                Logger.error('Failed to declare exchange', error2);
                reject(error2);
                return;
              }

              // Declare queues from environment variables
              const waitlistQueue = process.env.RABBIT_WAITLIST_QUEUE || 'events.payment';
              const bindQueue = process.env.RABBIT_BIND_QUEUE || 'payment.issue';

              channel.assertQueue(waitlistQueue, { durable: true }, (error3) => {
                if (error3) {
                  Logger.error('Failed to declare waitlist queue', error3);
                  reject(error3);
                  return;
                }

                channel.assertQueue(bindQueue, { durable: true }, (error4) => {
                  if (error4) {
                    Logger.error('Failed to declare bind queue', error4);
                    reject(error4);
                    return;
                  }

                  // Bind queue to exchange if RABBIT_AUTOBIND is enabled
                  const autoBind = process.env.RABBIT_AUTOBIND === 'true';
                  if (autoBind) {
                    const bindKey = process.env.RABBIT_BIND_KEY || 'event.settlement.issue';
                    channel.bindQueue(bindQueue, this.exchange, bindKey, {}, (error5) => {
                      if (error5) {
                        Logger.error('Failed to bind queue', error5);
                        reject(error5);
                        return;
                      }
                      Logger.info(`Queue ${bindQueue} bound to exchange ${this.exchange} with key ${bindKey}`);
                      Logger.success('Connected to RabbitMQ successfully with queue bindings');
                    });
                  } else {
                    Logger.success('Connected to RabbitMQ successfully');
                  }
                });
              });

              // Handle connection events
              connection.on('error', (err) => {
                Logger.error('RabbitMQ connection error', err);
                this.connection = null;
                this.channel = null;
              });

              connection.on('close', () => {
                Logger.warning('RabbitMQ connection closed');
                this.connection = null;
                this.channel = null;
              });

              resolve();
            });
          });
        });
      } catch (error) {
        Logger.error('Failed to connect to RabbitMQ', error);
        reject(error);
      }
    });
  }

  async publishPaymentCharge(message: PaymentChargeMessage): Promise<{ id: string; status: string }> {
    try {
      await this.connect();

      if (!this.channel) {
        throw new Error('RabbitMQ channel not available');
      }

      const routingKey = process.env.RABBIT_BIND_KEY || 'event.settlement.issue';
      const messageBuffer = Buffer.from(JSON.stringify(message));

      // Log payload if enabled
      if (this.logPayloads) {
        const logPayload = messageBuffer.length > this.maxLogBytes
          ? messageBuffer.subarray(0, this.maxLogBytes).toString() + '...[truncated]'
          : messageBuffer.toString();

        Logger.info('Publishing payment charge message', {
          routingKey,
          exchange: this.exchange,
          payloadSize: messageBuffer.length,
          payload: logPayload
        });
      }

      // Publish message
      const published = this.channel.publish(
        this.exchange,
        routingKey,
        messageBuffer,
        {
          persistent: true,
          timestamp: Date.now(),
          messageId: `charge_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          correlationId: message.player_id,
          headers: {
            player_id: message.player_id,
            event_id: message.event_id,
            amount: message.amount.toString(),
            currency: message.currency
          }
        }
      );

      if (!published) {
        throw new Error('Failed to publish message to RabbitMQ');
      }

      Logger.success('Payment charge message published successfully', {
        player_id: message.player_id,
        amount: message.amount,
        routingKey
      });

      // Return mock response similar to gRPC response
      return {
        id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        status: 'pending' // Since we're publishing to queue, status is pending
      };

    } catch (error) {
      Logger.error('Failed to publish payment charge message', {
        player_id: message.player_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Retry logic
      await new Promise(resolve => setTimeout(resolve, this.retryMs));

      throw error;
    }
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (this.channel) {
          this.channel.close(() => {
            this.channel = null;
            if (this.connection) {
              this.connection.close(() => {
                this.connection = null;
                Logger.info('RabbitMQ connection closed');
                resolve();
              });
            } else {
              resolve();
            }
          });
        } else if (this.connection) {
          this.connection.close(() => {
            this.connection = null;
            Logger.info('RabbitMQ connection closed');
            resolve();
          });
        } else {
          resolve();
        }
      } catch (error) {
        Logger.error('Error closing RabbitMQ connection', error);
        resolve();
      }
    });
  }
}