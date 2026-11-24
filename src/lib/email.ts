/**
 * Provider-agnostic email sending.
 *
 * Today: if no provider is configured, isEmailConfigured() is false and the
 * send worker leaves deliveries queued (nothing is lost).
 *
 * Later: set EMAIL_PROVIDER + its key. Resend is implemented; add others here.
 */

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

const PROVIDER = (process.env.EMAIL_PROVIDER ?? "resend").toLowerCase();

export function isEmailConfigured(): boolean {
  if (!process.env.EMAIL_FROM) return false;
  switch (PROVIDER) {
    case "resend":
      return Boolean(process.env.RESEND_API_KEY);
    default:
      return false;
  }
}

export async function sendEmail(msg: OutgoingEmail): Promise<SendResult> {
  if (!isEmailConfigured()) {
    throw new Error(
      "No email provider configured. Set EMAIL_FROM and a provider key (e.g. RESEND_API_KEY).",
    );
  }
  switch (PROVIDER) {
    case "resend":
      return sendViaResend(msg);
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER: ${PROVIDER}`);
  }
}

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
