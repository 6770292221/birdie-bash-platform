import { consume } from '../config/rabbit';
import { connectMongo } from '../config/mongo';
import { NotificationLog } from '../models/NotificationLog';
import { NotificationEvent, Channel } from '../types/NotificationEvent';
import { sendEmail } from '../providers/emailProvider';
import { sendSms } from '../providers/smsProvider';
import { sendLine } from '../providers/lineProvider';
import pino from 'pino';

const log = pino({ transport: { target: 'pino-pretty' } });

async function handleChannel(channel: Channel, payload: NotificationEvent['payload']) {
  const { message, to, member } = payload;
  if (channel === 'email') {
    const email = member?.email || to?.email;
    if (!email) return { channel, status: 'SKIPPED' as const, error: 'No email' };
    try { const r = await sendEmail(email, message); return { channel, status: 'SUCCESS' as const, providerId: r.id }; }
    catch (e: any) { return { channel, status: 'FAIL' as const, error: e?.message || 'email error' }; }
  }
  if (channel === 'sms') {
    const phone = member?.phone || to?.phone;
    if (!phone) return { channel, status: 'SKIPPED' as const, error: 'No phone' };
    try { const r = await sendSms(phone, message); return { channel, status: 'SUCCESS' as const, providerId: r.id }; }
    catch (e: any) { return { channel, status: 'FAIL' as const, error: e?.message || 'sms error' }; }
  }
  if (channel === 'line') {
    try { const r = await sendLine(message); return { channel, status: 'SUCCESS' as const, providerId: r.id }; }
    catch (e: any) { return { channel, status: 'FAIL' as const, error: e?.message || 'line error' }; }
  }
  return { channel, status: 'SKIPPED' as const, error: 'Unknown channel' };
}

async function main() {
  await connectMongo();
  log.info('Mongo connected');

  await consume(async (msg) => {
    const raw = msg.content.toString();
    const event = JSON.parse(raw) as NotificationEvent;
    log.info({ event }, 'Received events.notification');

    const results = [] as any[];
    for (const ch of event.channels) {
      results.push(await handleChannel(ch, event.payload));
    }

    await NotificationLog.create({
      channels: event.channels,
      source: event.payload.source,
      payload: event.payload,
      results,
      meta: event.meta
    });

    log.info({ results }, 'Handled & logged');
  });

  log.info('Worker is consuming...');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
