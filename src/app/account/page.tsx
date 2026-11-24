import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { displayName } from "@/lib/display";
import { SiteHeader } from "@/components/site-header";
import { signOutAction } from "@/app/groups/actions";
import { AvatarPicker } from "./avatar-picker";
import { NameForm, EmailForm } from "./profile-forms";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await requireUser("/account");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = displayName(profile.email, profile.full_name);
  const email = user?.email ?? profile.email;

  return (
    <main className="min-h-screen">
      <SiteHeader homeHref={profile.role === "admin" ? "/dashboard" : "/groups"}>
        <Link
          href={profile.role === "admin" ? "/dashboard" : "/groups"}
          className="text-slate-200 hover:text-white"
        >
          {profile.role === "admin" ? "Dashboard" : "My groups"}
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded border border-white/20 px-3 py-1.5 text-slate-100 hover:bg-white/10"
          >
            Sign out
          </button>
        </form>
      </SiteHeader>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-100">Account</h1>

        <section className="card p-6">
          <h2 className="mb-4 font-semibold text-slate-100">Avatar</h2>
          <AvatarPicker
            userId={profile.id}
            currentUrl={profile.avatar_url}
            name={name}
          />
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-semibold text-slate-100">Name</h2>
          <NameForm fullName={profile.full_name ?? ""} />
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-semibold text-slate-100">Email</h2>
          <EmailForm email={email} />
        </section>
      </div>
    </main>
  );
}
