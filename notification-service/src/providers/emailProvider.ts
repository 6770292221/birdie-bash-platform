import nodemailer from 'nodemailer';
import { env } from '../config/env';

const baseConfig: any = {
  host: env.smtp.host,
  port: env.smtp.port,
  secure: false
};

if (env.smtp.user && env.smtp.pass) {
  baseConfig.auth = { user: env.smtp.user, pass: env.smtp.pass };
}

const transporter = nodemailer.createTransport(baseConfig);

export async function sendEmail(to: string, message: string): Promise<{ id: string }> {
  const info = await transporter.sendMail({
    from: env.emailFrom,
    to,
    subject: 'Notification',
    text: message
  });
  return { id: info.messageId };
}
