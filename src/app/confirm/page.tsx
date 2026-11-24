import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { List, Subscription } from "@/lib/database.types";

export const dynamic = "force-dynamic";

async function confirm(token: string) {
  const admin = createAdminClient();
  const { data: subRow } = await admin
    .from("subscriptions")
    .select("*")
    .eq("confirm_token", token)
    .maybeSingle();
  const sub = subRow as Subscription | null;
  if (!sub) return { status: "invalid" as const };

  const { data: listRow } = await admin
    .from("lists")
    .select("name, slug")
    .eq("id", sub.list_id)
    .single();
  const list = listRow as Pick<List, "name" | "slug">;

  if (sub.status === "confirmed") {
    return { status: "already" as const, list };
  }

  await admin
    .from("subscriptions")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", sub.id);

  return { status: "confirmed" as const, list };
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await confirm(token) : { status: "invalid" as const };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md p-8 text-center">
        {result.status === "confirmed" && (
          <>
            <h1 className="text-xl font-semibold text-slate-100">
              You&apos;re subscribed 🎉
            </h1>
            <p className="mt-2 text-slate-300">
              Your subscription to{" "}
              <strong>{result.list.name}</strong> is confirmed.
            </p>
          </>
        )}
        {result.status === "already" && (
          <>
            <h1 className="text-xl font-semibold text-slate-100">
              Already confirmed
            </h1>
            <p className="mt-2 text-slate-300">
              You&apos;re already subscribed to{" "}
              <strong>{result.list.name}</strong>.
            </p>
          </>
        )}
        {result.status === "invalid" && (
          <>
            <h1 className="text-xl font-semibold text-slate-100">
              Invalid or expired link
            </h1>
            <p className="mt-2 text-slate-300">
              We couldn&apos;t find that confirmation. Try subscribing again.
            </p>
          </>
        )}
        <Link href="/" className="btn-secondary mt-6">
          Back to all lists
        </Link>
      </div>
    </main>
  );
}
