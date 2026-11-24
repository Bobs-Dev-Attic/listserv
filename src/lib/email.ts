/**
 * Multi-provider email sending.
 *
 * Resolution order for the SMTP transport:
 *   1. The active server in the email_servers table (admin-managed, if any).
 *   2. Env config: LISTSERV_EMAIL_PROVIDER = "resend" (HTTP API) or "smtp".
 *
 * LISTSERV_EMAIL_FROM is required for the env path; the DB server carries its
 * own from_email.
 *
 * If nothing is configured, isEmailConfigured() is false and the send worker
 * leaves deliveries queued.
 */

import { createAdminClient } from "@/lib/supabase/admin";

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

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
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

/** The admin-configured active SMTP server, if one exists. */
async function activeServer(): Promise<SmtpConfig | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("email_servers")
      .select("host, port, secure, username, password, from_email")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const s = data as {
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
      from_email: string;
    };
    return {
      host: s.host,
      port: s.port,
      secure: s.secure,
      user: s.username,
      pass: s.password,
      from: s.from_email,
    };
  } catch {
    return null;
  }
}

function envSmtp(): SmtpConfig | null {
  const host = env.smtpHost();
  const user = env.smtpUser();
  const pass = env.smtpPass();
  const from = env.from();
  if (!host || !user || !pass || !from) return null;
  const port = Number(env.smtpPort() ?? "587");
  const secure =
    (env.smtpSecure() ?? (port === 465 ? "true" : "false")) === "true";
  return { host, port, secure, user, pass, from };
}

export async function isEmailConfigured(): Promise<boolean> {
  if (await activeServer()) return true;
  if (emailProvider() === "resend") {
    return Boolean(env.resendKey() && env.from());
  }
  return envSmtp() != null;
}

export async function sendEmail(msg: OutgoingEmail): Promise<SendResult> {
  const server = (await activeServer()) ?? null;
  if (server) return sendViaSmtp(server, msg);

  if (emailProvider() === "resend") {
    if (!env.resendKey() || !env.from()) {
      throw new Error("Resend not configured (LISTSERV_RESEND_API_KEY / LISTSERV_EMAIL_FROM).");
    }
    return sendViaResend(msg);
  }

  const cfg = envSmtp();
  if (!cfg) {
    throw new Error(
      "No email server configured. Add one in the SMTP settings, or set the LISTSERV_SMTP_* / RESEND env vars.",
    );
  }
  return sendViaSmtp(cfg, msg);
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

async function sendViaSmtp(
  cfg: SmtpConfig,
  msg: OutgoingEmail,
): Promise<SendResult> {
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  const info = await transport.sendMail({
    from: cfg.from,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
    replyTo: msg.replyTo,
    headers: msg.headers,
  });
  return { providerMessageId: info.messageId ?? null };
}
