import { requireAdmin } from "@/lib/auth";
import { displayName } from "@/lib/display";
import { SiteHeader } from "@/components/site-header";
import { SideNav } from "@/components/side-nav";
import { UserMenu } from "@/components/user-menu";
import { VERSION_LABEL } from "@/lib/version";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen">
      <SiteHeader fullWidth homeHref="/dashboard" title="ListServ admin">
        <UserMenu
          name={displayName(profile.email, profile.full_name)}
          email={profile.email}
          avatarUrl={profile.avatar_url}
          isAdmin
        />
      </SiteHeader>

      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col md:flex-row">
        <SideNav
          heading="Admin"
          items={[
            { href: "/dashboard", label: "Overview", exact: true },
            { href: "/dashboard/lists", label: "Lists" },
            { href: "/dashboard/users", label: "Users" },
            { href: "/dashboard/roles", label: "Roles" },
            { href: "/dashboard/audit", label: "Audit log" },
            { href: "/dashboard/smtp", label: "SMTP" },
          ]}
          footer={
            <span title="App version">
              ListServ <span className="text-slate-300">{VERSION_LABEL}</span>
            </span>
          }
        />
        <main className="min-w-0 flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
