import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
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
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold text-gray-900">
              ListServ <span className="text-gray-400">admin</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-gray-600">
              <Link href="/dashboard" className="hover:text-gray-900">
                Overview
              </Link>
              <Link href="/dashboard/lists" className="hover:text-gray-900">
                Lists
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-gray-500 sm:inline">
              {profile.email}
            </span>
            <Link href="/" className="text-gray-500 hover:text-gray-900">
              View site
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="btn-secondary px-3 py-1.5">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
