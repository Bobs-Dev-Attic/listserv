"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site";
import type { List, Subscription } from "@/lib/database.types";

export interface SubscribeState {
  ok: boolean;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeAction(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  const admin = createAdminClient();

  const { data: listRow } = await admin
    .from("lists")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();
  const list = listRow as List | null;
  if (!list) {
    return { ok: false, message: "This list is not available." };
  }

  // Existing subscription?
  const { data: existingRow } = await admin
    .from("subscriptions")
    .select("*")
    .eq("list_id", list.id)
    .eq("email", email)
    .maybeSingle();
  const existing = existingRow as Subscription | null;

  if (existing?.status === "confirmed") {
    return { ok: true, message: "You're already subscribed to this list." };
  }

  let token: string;
  if (existing) {
    // Re-subscribe: reset to pending with a fresh confirm token.
    const { data: updated } = await admin
      .from("subscriptions")
      .update({ status: "pending" })
      .eq("id", existing.id)
      .select("confirm_token")
      .single();
    token = (updated as { confirm_token: string }).confirm_token;
  } else {
    const { data: inserted, error } = await admin
      .from("subscriptions")
      .insert({ list_id: list.id, email })
      .select("confirm_token")
      .single();
    if (error || !inserted) {
      return { ok: false, message: "Something went wrong. Please try again." };
    }
    token = (inserted as { confirm_token: string }).confirm_token;
  }

  const confirmUrl = `${siteUrl()}/confirm?token=${token}`;

  if (isEmailConfigured()) {
    try {
      await sendEmail({
        to: email,
        subject: `Confirm your subscription to ${list.name}`,
        text:
          `You (or someone using this address) asked to join "${list.name}".\n\n` +
          `Confirm your subscription:\n${confirmUrl}\n\n` +
          `If you didn't request this, you can ignore this email.`,
      });
      return {
        ok: true,
        message: "Almost there! Check your inbox for a confirmation link.",
      };
    } catch {
      return {
        ok: true,
        message:
          "You're on the list as pending — but the confirmation email failed to send. Please contact the list owner.",
      };
    }
  }

  // No provider configured yet: record the request; an admin can confirm manually.
  return {
    ok: true,
    message:
      "Thanks! Your request was recorded. Email delivery isn't configured yet, so a list admin will confirm you shortly.",
  };
}
