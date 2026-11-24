"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SideNavItem {
  href: string;
  label: string;
  /** Active only on an exact path match (otherwise prefix match). */
  exact?: boolean;
  icon?: React.ReactNode;
}

export function SideNav({
  heading,
  items,
}: {
  heading?: string;
  items: SideNavItem[];
}) {
  const path = usePathname();
  return (
    <aside className="w-full shrink-0 bg-[#2b3e50] text-sm text-slate-200 md:w-56">
      {heading && (
        <div className="truncate border-b border-white/10 px-4 py-3 font-semibold text-white">
          {heading}
        </div>
      )}
      <nav className="py-2">
        {items.map((it) => {
          const active = it.exact ? path === it.href : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 px-4 py-2 ${
                active
                  ? "bg-[#4a90d2] font-medium text-white"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              {it.icon && (
                <span className="grid h-4 w-4 place-items-center">{it.icon}</span>
              )}
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
