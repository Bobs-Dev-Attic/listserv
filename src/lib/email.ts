/**
 * Multi-provider email sending.
 *
 * Config is namespaced under LISTSERV_ so it never collides with the many
 * SUPABASE_ / POSTGRES_ vars the integration adds. Pick a provider with
 * LISTSERV_EMAIL_PROVIDER (default "resend"):
 *   - "resend" : Resend HTTP API      (LISTSERV_RESEND_API_KEY)
 *   - "smtp"   : any SMTP server      (LISTSERV_SMTP_HOST/PORT/USER/PASS) —
 *                works with Brevo, Amazon SES, Mailgun, Postmark, etc.
 *
 * LISTSERV_EMAIL_FROM is required for every provider, e.g.
 * "My List <list@domain.com>".
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

const env = {
  provider: () => process.env.LISTSERV_EMAIL_PROVIDER,
  from: () => process.env.LISTSERV_EMAIL_FROM,
  resendKey: () => process.env.LISTSERV_RESEND_API_KEY,
  smtpHost: () => process.env.LISTSERV_SMTP_HOST,
  smtpPort: () => process.env.LISTSERV_SMTP_PORT,
  smtpSecure: () => process.env.LISTSERV_SMTP_SECURE,
  smtpUser: () => process.env.LISTSERV_SMTP_USER,
  smtpPass: () => process.env.LISTSERV_SMTP_PASS,
};

export function emailProvider(): EmailProvider {
  const p = (env.provider() ?? "resend").toLowerCase();
  return p === "smtp" ? "smtp" : "resend";
}

export function isEmailConfigured(): boolean {
  if (!env.from()) return false;
  switch (emailProvider()) {
    case "resend":
      return Boolean(env.resendKey());
    case "smtp":
      return Boolean(env.smtpHost() && env.smtpUser() && env.smtpPass());
    default:
      return false;
  }
}

export async function sendEmail(msg: OutgoingEmail): Promise<SendResult> {
  if (!isEmailConfigured()) {
    throw new Error(
      "No email provider configured. Set LISTSERV_EMAIL_FROM and the keys for " +
        "your LISTSERV_EMAIL_PROVIDER (LISTSERV_RESEND_API_KEY, or " +
        "LISTSERV_SMTP_HOST/USER/PASS).",
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
      Authorization: `Bearer ${env.resendKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.from(),
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
  const port = Number(env.smtpPort() ?? "587");
  // secure=true for port 465 (implicit TLS); false uses STARTTLS on 587/25.
  const secure =
    (env.smtpSecure() ?? (port === 465 ? "true" : "false")) === "true";
  smtpTransport = nodemailer.createTransport({
    host: env.smtpHost(),
    port,
    secure,
    auth: {
      user: env.smtpUser(),
      pass: env.smtpPass(),
    },
  });
  return smtpTransport;
}

async function sendViaSmtp(msg: OutgoingEmail): Promise<SendResult> {
  const transport = await getSmtpTransport();
  const info = await transport.sendMail({
    from: env.from(),
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
    replyTo: msg.replyTo,
    headers: msg.headers,
  });
  return { providerMessageId: info.messageId ?? null };
}
