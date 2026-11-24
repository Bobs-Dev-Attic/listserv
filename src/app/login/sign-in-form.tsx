"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <p className="text-center text-xs text-gray-500">
        No password needed — we&apos;ll email you a one-time code.
      </p>
    </form>
  );
}
