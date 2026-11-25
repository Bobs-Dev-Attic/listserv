import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SideNav } from "@/components/side-nav";
import { VERSION_LABEL } from "@/lib/version";
import { signOutAction } from "./actions";

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
        <Link
          href="/account"
          className="hidden text-slate-300 hover:text-white sm:inline"
        >
          {profile.email}
        </Link>
        <Link href="/" className="text-slate-200 hover:text-white">
          View site
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded border border-white/20 px-3 py-1.5 text-slate-100 hover:bg-white/10"
          >
            Log out
          </button>
        </form>
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
