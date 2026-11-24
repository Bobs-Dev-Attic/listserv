"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm({ redirectTo = "/groups" }: { redirectTo?: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [useEmail, setUseEmail] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
    }
    // On success the browser is redirected to Google.
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const addr = email.trim().toLowerCase();
    if (!EMAIL_RE.test(addr)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEmail(addr);
    setStep("code");
    setInfo(`We emailed a 6-digit code to ${addr}. It expires in 1 hour.`);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = code.trim();
    if (!/^\d{6}$/.test(token)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  // --- Google (primary) ---
  if (!useEmail) {
    return (
      <div className="mt-6 space-y-4">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="btn-secondary w-full"
        >
          <GoogleIcon />
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          or
          <span className="h-px flex-1 bg-gray-200" />
        </div>
        <button
          type="button"
          onClick={() => {
            setUseEmail(true);
            setError(null);
          }}
          className="w-full text-sm font-medium text-brand-600 hover:underline"
        >
          Sign in with an email code
        </button>
      </div>
    );
  }

  // --- Email code: step 2 (enter code) ---
  if (step === "code") {
    return (
      <form onSubmit={verifyCode} className="mt-6 space-y-4">
        {info && (
          <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">
            {info}
          </p>
        )}
        <div>
          <label htmlFor="code" className="label">
            6-digit code
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="input text-center text-lg tracking-[0.5em]"
          />
        </div>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Verifying…" : "Verify & sign in"}
        </button>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
              setInfo(null);
            }}
            className="text-gray-500 hover:text-gray-900"
          >
            ← Use a different email
          </button>
          <button
            type="button"
            onClick={requestCode}
            disabled={loading}
            className="font-medium text-brand-600 hover:underline disabled:opacity-50"
          >
            Resend code
          </button>
        </div>
      </form>
    );
  }

  // --- Email code: step 1 (enter email) ---
  return (
    <form onSubmit={requestCode} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input"
        />
      </div>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Sending code…" : "Email me a sign-in code"}
      </button>
      <button
        type="button"
        onClick={() => {
          setUseEmail(false);
          setError(null);
          setInfo(null);
        }}
        className="w-full text-center text-sm text-gray-500 hover:text-gray-900"
      >
        ← Back to Google
      </button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 4.75 12 4.75z"
      />
    </svg>
  );
}
