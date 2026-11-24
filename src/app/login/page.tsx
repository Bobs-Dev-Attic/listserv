import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-lg font-semibold">
          ListServ
        </Link>
        <div className="card mt-6 p-8">
          <h1 className="text-xl font-semibold text-gray-900">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter your email and we&apos;ll send you a 6-digit code.
          </p>
          <SignInForm redirectTo={redirect ?? "/groups"} />
        </div>
        <p className="mt-4 text-center text-xs text-gray-500">
          The first person to sign in becomes the admin.
        </p>
      </div>
    </main>
  );
}
