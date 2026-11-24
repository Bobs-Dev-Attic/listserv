import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-lg font-semibold">
          ListServ
        </Link>
        <div className="card mt-6 p-8">
          <h1 className="text-xl font-semibold text-slate-100">Sign in</h1>
          <p className="mt-1 text-sm text-slate-400">
            Continue with Google, or use an email code.
          </p>
          {error && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
              Sign-in didn&apos;t complete. Please try again.
            </p>
          )}
          <SignInForm redirectTo={redirect ?? "/groups"} />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          The first person to sign in becomes the admin.
        </p>
      </div>
    </main>
  );
}
