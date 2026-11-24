/**
 * Multi-provider email sending.
 *
 * Pick a provider with EMAIL_PROVIDER (default "resend"):
 *   - "resend" : Resend HTTP API      (RESEND_API_KEY)
 *   - "smtp"   : any SMTP server      (SMTP_HOST/PORT/USER/PASS) —
 *                works with Brevo, Amazon SES, Mailgun, Postmark, etc.
 *
 * EMAIL_FROM is required for every provider, e.g. "My List <list@domain.com>".
 *
 * If the chosen provider isn't configured, isEmailConfigured() is false and the
 * send worker leaves deliveries queued (nothing is lost).
 */

export type EmailProvider = "resend" | "smtp";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface SendResult {
  providerMessageId: string | null;
}

export function emailProvider(): EmailProvider {
  const p = (process.env.EMAIL_PROVIDER ?? "resend").toLowerCase();
  return p === "smtp" ? "smtp" : "resend";
}

export function isEmailConfigured(): boolean {
  if (!process.env.EMAIL_FROM) return false;
  switch (emailProvider()) {
    case "resend":
      return Boolean(process.env.RESEND_API_KEY);
    case "smtp":
      return Boolean(
        process.env.SMTP_HOST &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASS,
      );
    default:
      return false;
  }
}

export async function sendEmail(msg: OutgoingEmail): Promise<SendResult> {
  if (!isEmailConfigured()) {
    throw new Error(
      "No email provider configured. Set EMAIL_FROM and the keys for your " +
        "EMAIL_PROVIDER (RESEND_API_KEY, or SMTP_HOST/USER/PASS).",
    );
  }
  switch (emailProvider()) {
    case "resend":
      return sendViaResend(msg);
    case "smtp":
      return sendViaSmtp(msg);
  }
}

// --------------------------- Resend (HTTP API) ---------------------------

async function sendViaResend(msg: OutgoingEmail): Promise<SendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      reply_to: msg.replyTo,
      headers: msg.headers,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { id?: string };
  return { providerMessageId: data.id ?? null };
}

// --------------------------- Generic SMTP ---------------------------

// Reuse a single transport across invocations in a warm serverless instance.
let smtpTransport: import("nodemailer").Transporter | null = null;

async function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(process.env.SMTP_PORT ?? "587");
  // secure=true for port 465 (implicit TLS); false uses STARTTLS on 587/25.
  const secure =
    (process.env.SMTP_SECURE ?? (port === 465 ? "true" : "false")) === "true";
  smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return smtpTransport;
}

async function sendViaSmtp(msg: OutgoingEmail): Promise<SendResult> {
  const transport = await getSmtpTransport();
  const info = await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
    replyTo: msg.replyTo,
    headers: msg.headers,
  });
  return { providerMessageId: info.messageId ?? null };
}
