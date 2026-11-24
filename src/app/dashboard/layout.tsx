import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
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
      <SiteHeader
        homeHref="/dashboard"
        title="ListServ admin"
        nav={
          <>
            <Link href="/dashboard" className="hover:text-white">
              Overview
            </Link>
            <Link href="/dashboard/lists" className="hover:text-white">
              Lists
            </Link>
          </>
        }
      >
        <span className="hidden text-slate-300 sm:inline">{profile.email}</span>
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
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
