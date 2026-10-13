import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const mailConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  return transporter;
}

/**
 * Fire-and-forget: never throws and never blocks the caller. A mail failure
 * must not fail an order. When SMTP isn't configured the mail is only logged.
 */
export function sendMail(msg: MailMessage): void {
  if (!mailConfigured) {
    logger.warn({ to: msg.to, subject: msg.subject }, 'SMTP not configured — email skipped');
    return;
  }
  getTransporter()
    .sendMail({
      from: env.MAIL_FROM ?? `EZiWear <${env.SMTP_USER}>`,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    })
    .then((info) =>
      logger.info(
        {
          to: msg.to,
          subject: msg.subject,
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
        },
        'email sent',
      ),
    )
    .catch((err: unknown) => logger.error({ err, to: msg.to }, 'email failed'));
}
