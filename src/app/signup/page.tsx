import Link from "next/link";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-lg font-semibold">
          ListServ
        </Link>
        <div className="card mt-6 p-8">
          <h1 className="text-xl font-semibold text-gray-900">Create account</h1>
          <p className="mt-1 text-sm text-gray-500">
            The first account created becomes the admin.
          </p>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-600">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
