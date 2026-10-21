import nodemailer, { type Transporter } from "nodemailer";

/**
 * Lazily-created, process-wide SMTP transporter (Gmail by default). Cached on
 * `globalThis` so dev HMR doesn't reopen a connection pool on every reload —
 * same pattern as `lib/redis.ts`.
 */

declare global {
  var __jemsMailer: Transporter | null | undefined;
}

function buildTransporter(): Transporter | null {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    console.error("[mailer] SMTP_USER/SMTP_PASS not set — cannot send email.");
    return null;
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function getTransporter(): Transporter | null {
  if (globalThis.__jemsMailer !== undefined) return globalThis.__jemsMailer;
  const transporter = buildTransporter();
  globalThis.__jemsMailer = transporter;
  return transporter;
}

export interface SendMailArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Sends an email via the configured SMTP transport. Throws if unconfigured or on delivery failure. */
export async function sendMail({ to, subject, html, text }: SendMailArgs): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) throw new Error("Email transport is not configured.");

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({ from, to, subject, html, text });
}
