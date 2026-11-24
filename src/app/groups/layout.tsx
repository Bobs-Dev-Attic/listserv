import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { displayName } from "@/lib/display";
import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser();
  const name = displayName(profile.email, profile.full_name);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#2b3e50] text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/groups" className="flex items-center gap-2 font-semibold">
              <svg
                className="h-6 w-6 text-[#4a90d2]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 5L2 7" />
              </svg>
              ListServ Groups
            </Link>
            <nav className="hidden items-center gap-5 text-sm text-slate-200 sm:flex">
              <Link href="/groups" className="hover:text-white">
                Your Groups
              </Link>
              <Link href="/" className="hover:text-white">
                Find a Group
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {profile.role === "admin" && (
              <Link href="/dashboard" className="text-slate-200 hover:text-white">
                Admin
              </Link>
            )}
            <span className="hidden text-slate-300 sm:inline">{name}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded border border-white/20 px-3 py-1.5 text-slate-100 hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
