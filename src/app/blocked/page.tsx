import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/groups/actions";
import type { Profile } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function BlockedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let status: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();
    status = (data as Pick<Profile, "status"> | null)?.status ?? null;
  }

  const pending = status === "pending";

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-100">
          {pending ? "Awaiting approval" : "Account unavailable"}
        </h1>
        <p className="mt-2 text-slate-300">
          {pending
            ? "Your account is pending approval. An administrator will review it soon."
            : "Your account has been blocked. If you think this is a mistake, contact an administrator."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <form action={signOutAction}>
            <button className="btn-secondary">Sign out</button>
          </form>
          <Link href="/" className="btn-secondary">
            Back to site
          </Link>
        </div>
      </div>
    </main>
  );
}
