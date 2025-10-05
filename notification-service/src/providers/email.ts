import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT || 1025),
  secure: false,
  tls: { rejectUnauthorized: false },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

export async function sendEmailOne(to: string, subject: string, html: string) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || "BBP Notify <no-reply@bbp.local>",
    to,
    subject,
    html,                // <- สำคัญ ต้องใช้ html
    text: html.replace(/<[^>]+>/g, " ") // เผื่อ client ที่อ่านได้แต่ text
  });
}
