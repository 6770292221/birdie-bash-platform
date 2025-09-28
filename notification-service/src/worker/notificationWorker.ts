import { consume } from '../config/rabbit';
import { connectMongo } from '../config/mongo';
import { NotificationLog } from '../models/NotificationLog';
import { NotificationEvent, Channel } from '../types/NotificationEvent';
import { sendEmail } from '../providers/emailProvider';
import { sendSms } from '../providers/smsProvider';
import { sendLine } from '../providers/lineProvider';
import { buildMessages } from '../templates/templates';
import pino from 'pino';

const log = pino({ transport: { target: 'pino-pretty' } });

async function handleChannel(channel: Channel, event: NotificationEvent) {
  const { payload } = event;
  let emailSubject = 'Notification';
  let emailBody    = payload.message || '';
  let smsText      = payload.message || '';
  let lineText     = payload.message || '';

  if (event.template) {
    try {
      const built = buildMessages(event.template.id as any, event.template.data);
      emailSubject = built.emailSubject || emailSubject;
      emailBody    = built.emailBody    || emailBody;
      smsText      = built.sms          || smsText;
      lineText     = built.line         || lineText;
    } catch (e: any) {
      log.warn({ err: e?.message, templateId: event.template.id }, 'template render failed, fallback to payload.message');
    }
  }

  if (channel === 'email') {
    const email = payload.member?.email || payload.to?.email;
    if (!email) return { channel, status: 'SKIPPED' as const, error: 'No email' };
    try { const r = await sendEmail(email, emailSubject, emailBody); return { channel, status: 'SUCCESS' as const, providerId: r.id }; }
    catch (e: any) { return { channel, status: 'FAIL' as const, error: e?.message || 'email error' }; }
  }
  if (channel === 'sms') {
    const phone = payload.member?.phone || payload.to?.phone;
    if (!phone) return { channel, status: 'SKIPPED' as const, error: 'No phone' };
    try { const r = await sendSms(phone, smsText); return { channel, status: 'SUCCESS' as const, providerId: r.id }; }
    catch (e: any) { return { channel, status: 'FAIL' as const, error: e?.message || 'sms error' }; }
  }
  if (channel === 'line') {
    try { const r = await sendLine(lineText); return { channel, status: 'SUCCESS' as const, providerId: r.id }; }
    catch (e: any) { return { channel, status: 'FAIL' as const, error: e?.message || 'line error' }; }
  }
  if (channel === 'webPush') {
    return { channel, status: 'SKIPPED' as const, error: 'webPush provider not implemented' };
  }
  return { channel, status: 'SKIPPED' as const, error: 'Unknown channel' };
}

async function main() {
  await connectMongo();
  log.info('Mongo connected');
  await consume(async (msg) => {
    const event = JSON.parse(msg.content.toString()) as NotificationEvent;
    log.info({ event }, 'Received events.notification');
    const results = [];
    for (const ch of event.channels) results.push(await handleChannel(ch, event));
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
main().catch((e) => { console.error(e); process.exit(1); });
