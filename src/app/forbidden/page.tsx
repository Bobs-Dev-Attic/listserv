import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-100">Admins only</h1>
        <p className="mt-2 text-slate-300">
          Your account doesn&apos;t have admin access to this dashboard.
        </p>
        <Link href="/" className="btn-secondary mt-6">
          Back to site
        </Link>
      </div>
    </main>
  );
}
