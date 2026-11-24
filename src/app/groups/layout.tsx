import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/groups"
              className="flex items-center gap-2 font-semibold text-gray-900"
            >
              <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-sm text-white">
                L
              </span>
              ListServ Groups
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {profile.role === "admin" && (
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
                Admin
              </Link>
            )}
            <span className="hidden text-gray-500 sm:inline">{profile.email}</span>
            <form action={signOutAction}>
              <button type="submit" className="btn-secondary px-3 py-1.5">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
