import Link from "next/link";

export function SiteHeader({
  homeHref = "/",
  title = "ListServ",
  nav,
  children,
}: {
  homeHref?: string;
  title?: string;
  nav?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="bg-[#2b3e50] text-white shadow">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href={homeHref} className="flex items-center gap-2 font-semibold">
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
            {title}
          </Link>
          {nav && (
            <nav className="hidden items-center gap-5 text-sm text-slate-200 sm:flex">
              {nav}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">{children}</div>
      </div>
    </header>
  );
}
