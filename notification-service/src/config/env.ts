import dotenv from 'dotenv';
dotenv.config();

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: req('MONGODB_URI'),
  rabbitUrl: req('RABBIT_URL'),
  exchangeName: process.env.RABBIT_EXCHANGE || 'events',
  routingKey: process.env.RABBIT_NOTIFY_BIND_KEY || 'event.#',
  queueName: process.env.RABBIT_NOTIFY_QUEUE || 'events.notification',
  emailFrom: process.env.EMAIL_FROM || 'no-reply@example.com',
  smtp: {
    host: req('SMTP_HOST'),
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined
  },
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID || '',
    token: process.env.TWILIO_AUTH_TOKEN || '',
    from: process.env.TWILIO_FROM || ''
  },
  line: {
    notifyToken: process.env.LINE_NOTIFY_TOKEN || ''
  }
};
