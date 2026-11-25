import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { displayName } from "@/lib/display";
import { UserMenu } from "@/components/user-menu";

export const dynamic = "force-dynamic";

export default async function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser();
  const name = displayName(profile.email, profile.full_name);

  return (
    <div className="min-h-screen bg-[#2d3139] text-slate-200">
      <header className="bg-[#2b6cb0] text-white shadow">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/groups" className="flex items-center gap-2 font-semibold text-white">
              <svg
                className="h-6 w-6"
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
            <nav className="hidden items-center gap-5 text-sm text-blue-100 sm:flex">
              <Link href="/groups" className="hover:text-white">
                Your Groups
              </Link>
              <Link href="/" className="hover:text-white">
                Find a Group
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <UserMenu
              name={name}
              email={profile.email}
              avatarUrl={profile.avatar_url}
              isAdmin={profile.role === "admin"}
            />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
