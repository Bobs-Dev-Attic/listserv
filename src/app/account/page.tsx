import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { displayName } from "@/lib/display";
import { SiteHeader } from "@/components/site-header";
import { SideNav } from "@/components/side-nav";
import { UserMenu } from "@/components/user-menu";
import { AvatarPicker } from "./avatar-picker";
import { NameForm, UsernameForm, EmailForm } from "./profile-forms";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await requireUser("/account");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = displayName(profile.email, profile.full_name);
  const email = user?.email ?? profile.email;
  const isAdmin = profile.role === "admin";

  const navItems = [
    { href: "/account", label: "Profile", exact: true },
    { href: "/groups", label: "My groups" },
    ...(isAdmin ? [{ href: "/dashboard", label: "Admin dashboard" }] : []),
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader fullWidth homeHref={isAdmin ? "/dashboard" : "/groups"}>
        <UserMenu
          name={name}
          email={email}
          avatarUrl={profile.avatar_url}
          handle={profile.username}
          isAdmin={isAdmin}
        />
      </SiteHeader>

      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col md:flex-row">
        <SideNav heading="Account" items={navItems} />

        <main className="min-w-0 flex-1 px-4 py-8 md:px-8">
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-100">Profile</h1>

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
              <h2 className="mb-4 font-semibold text-slate-100">Username</h2>
              <UsernameForm username={profile.username ?? ""} />
            </section>

            <section className="card p-6">
              <h2 className="mb-4 font-semibold text-slate-100">Email</h2>
              <EmailForm email={email} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
