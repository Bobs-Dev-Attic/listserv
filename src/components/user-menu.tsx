"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { signOutAction } from "@/app/groups/actions";

export function UserMenu({
  name,
  email,
  avatarUrl,
  handle = null,
  isAdmin = false,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  handle?: string | null;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded px-2 py-1 text-white hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar url={avatarUrl} name={name} size={28} />
        <span className="hidden max-w-[12rem] truncate font-medium sm:inline">
          {name}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-md border border-white/10 bg-[#2a2e37] text-sm text-slate-200 shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <Avatar url={avatarUrl} name={name} size={40} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{name}</div>
              {handle && (
                <div className="truncate text-xs text-[#5b9bd5]">@{handle}</div>
              )}
              <div className="truncate text-xs text-slate-400">{email}</div>
            </div>
          </div>

          <nav className="py-1">
            <MenuLink href="/account" onNavigate={() => setOpen(false)}>
              <UserIcon />
              Profile
            </MenuLink>
            <MenuLink href="/groups" onNavigate={() => setOpen(false)}>
              <GroupsIcon />
              My groups
            </MenuLink>
            {isAdmin && (
              <MenuLink href="/dashboard" onNavigate={() => setOpen(false)}>
                <ShieldIcon />
                Admin dashboard
              </MenuLink>
            )}
          </nav>

          <div className="border-t border-white/10 py-1">
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-slate-200 hover:bg-white/10"
              >
                <PowerIcon />
                Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-2 text-slate-200 hover:bg-white/10"
    >
      {children}
    </Link>
  );
}

function iconProps(className = "h-4 w-4 text-slate-400") {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

function UserIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}
