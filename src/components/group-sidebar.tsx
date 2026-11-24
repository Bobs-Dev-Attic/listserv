import Link from "next/link";
import { leaveGroupAction } from "@/app/groups/actions";

type Active = "messages" | "new" | "about";

export function GroupSidebar({
  slug,
  listId,
  name,
  canPost,
  active,
}: {
  slug: string;
  listId: string;
  name: string;
  canPost: boolean;
  active: Active;
}) {
  return (
    <aside className="md:w-56 md:shrink-0">
      <div className="overflow-hidden rounded-lg bg-[#2b3e50] text-sm text-slate-200">
        <div className="truncate border-b border-white/10 px-4 py-3 font-semibold text-white">
          {name}
        </div>
        <nav className="p-2">
          <NavItem
            href={`/groups/${slug}`}
            active={active === "messages"}
            label="Messages"
            icon={
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            }
          />
          {canPost && (
            <NavItem
              href={`/groups/${slug}/new`}
              active={active === "new"}
              label="New Topic"
              icon={
                <>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </>
              }
            />
          )}
        </nav>
        <div className="border-t border-white/10 p-2">
          <Link
            href="/groups"
            className="block rounded px-3 py-2 text-slate-300 hover:bg-white/10"
          >
            ← All groups
          </Link>
          <form action={leaveGroupAction}>
            <input type="hidden" name="list_id" value={listId} />
            <button className="w-full rounded px-3 py-2 text-left text-slate-300 hover:bg-white/10">
              Leave group
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  active,
  label,
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded px-3 py-2 ${
        active
          ? "bg-[#4a90d2] font-medium text-white"
          : "text-slate-200 hover:bg-white/10"
      }`}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {icon}
      </svg>
      {label}
    </Link>
  );
}
