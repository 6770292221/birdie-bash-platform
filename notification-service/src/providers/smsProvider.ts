import twilio from 'twilio';
import { env } from '../config/env';

const client = env.twilio.sid && env.twilio.token ? twilio(env.twilio.sid, env.twilio.token) : null as any;

export async function sendSms(to: string, message: string): Promise<{ id: string }> {
  if (!client) {
    // Dev mode fallback — log only
    return { id: 'DEV-NO-TWILIO' };
  }
  const res = await client.messages.create({ to, from: env.twilio.from, body: message });
  return { id: res.sid };
}
