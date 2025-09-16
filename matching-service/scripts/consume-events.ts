import amqp from 'amqplib';

async function main() {
  const url = process.env.RABBIT_URL || 'amqp://localhost';
  const queue = process.env.CONSUME_QUEUE || 'debug.events';
  const bindingKey = process.env.CONSUME_BINDING || 'event.#';

  console.log(`Connecting to RabbitMQ: ${url}`);
  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();
  await ch.assertExchange('events', 'topic', { durable: true });
  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, 'events', bindingKey);

  console.log(`✅ Bound queue '${queue}' to exchange 'events' with key '${bindingKey}'`);
  console.log(`📥 Waiting for messages. Press Ctrl+C to exit.`);

  ch.consume(queue, (msg) => {
    if (!msg) return;
    try {
      const content = msg.content.toString('utf8');
      const json = JSON.parse(content);
      console.log(`
=== Message ===
routingKey: ${msg.fields.routingKey}
payload:`, json);
    } catch (e) {
      console.log('Raw message:', msg.content.toString('utf8'));
    }
    ch.ack(msg);
  });

  process.on('SIGINT', async () => {
    await ch.close();
    await conn.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Consumer failed:', err);
  process.exit(1);
});

