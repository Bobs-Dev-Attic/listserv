import Link from "next/link";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; checkEmail?: string }>;
}) {
  const { redirect, checkEmail } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-lg font-semibold">
          ListServ
        </Link>
        <div className="card mt-6 p-8">
          <h1 className="text-xl font-semibold text-gray-900">Log in</h1>
          {checkEmail && (
            <p className="mt-3 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">
              Check your email to confirm your account, then log in.
            </p>
          )}
          <LoginForm redirectTo={redirect ?? "/dashboard"} />
          <p className="mt-6 text-center text-sm text-gray-600">
            No account?{" "}
            <Link href="/signup" className="font-medium text-brand-600">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
