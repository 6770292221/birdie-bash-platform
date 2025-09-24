import * as amqp from 'amqplib';
import { env } from '../config/env';

let cachedChannel: amqp.Channel | null = null;

export async function rabbitChannel(): Promise<amqp.Channel> {
  if (cachedChannel) return cachedChannel;
  const conn = await amqp.connect(env.rabbitUrl);
  const ch = await conn.createChannel();
  await ch.assertExchange(env.exchangeName, 'topic', { durable: true });
  await ch.assertQueue(env.queueName, { durable: true });
  await ch.bindQueue(env.queueName, env.exchangeName, env.routingKey);
  cachedChannel = ch;
  return ch;
}

export async function publish(routingKey: string, content: object) {
  const ch = await rabbitChannel();
  ch.publish(env.exchangeName, routingKey, Buffer.from(JSON.stringify(content)), {
    contentType: 'application/json',
    persistent: true
  });
}

export async function consume(onMessage: (msg: amqp.ConsumeMessage) => Promise<void>) {
  const ch = await rabbitChannel();
  await ch.consume(env.queueName, async (msg: amqp.ConsumeMessage | null) => {
    if (!msg) return;
    try {
      await onMessage(msg);
      ch.ack(msg);
    } catch {
      ch.nack(msg, false, false);
    }
  }, { noAck: false });
}
