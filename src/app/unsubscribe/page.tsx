import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { List, Subscription } from "@/lib/database.types";

export const dynamic = "force-dynamic";

async function unsubscribe(token: string) {
  const admin = createAdminClient();
  const { data: subRow } = await admin
    .from("subscriptions")
    .select("*")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  const sub = subRow as Subscription | null;
  if (!sub) return { status: "invalid" as const };

  const { data: listRow } = await admin
    .from("lists")
    .select("name, slug")
    .eq("id", sub.list_id)
    .single();
  const list = listRow as Pick<List, "name" | "slug">;

  if (sub.status !== "unsubscribed") {
    await admin
      .from("subscriptions")
      .update({ status: "unsubscribed" })
      .eq("id", sub.id);
  }
  return { status: "done" as const, list };
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await unsubscribe(token)
    : { status: "invalid" as const };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md p-8 text-center">
        {result.status === "done" ? (
          <>
            <h1 className="text-xl font-semibold text-slate-100">Unsubscribed</h1>
            <p className="mt-2 text-slate-300">
              You&apos;ve been removed from{" "}
              <strong>{result.list.name}</strong>. Sorry to see you go.
            </p>
            <Link href={`/lists/${result.list.slug}`} className="btn-secondary mt-6">
              Re-subscribe
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-slate-100">
              Invalid link
            </h1>
            <p className="mt-2 text-slate-300">
              We couldn&apos;t process that unsubscribe request.
            </p>
            <Link href="/" className="btn-secondary mt-6">
              Back to all lists
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
