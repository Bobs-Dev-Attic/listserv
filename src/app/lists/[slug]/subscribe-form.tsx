"use client";

import { useActionState } from "react";
import { subscribeAction, type SubscribeState } from "./actions";

const initial: SubscribeState = { ok: false, message: "" };

export function SubscribeForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(subscribeAction, initial);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label htmlFor="email" className="label">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="input"
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Subscribing…" : "Subscribe"}
      </button>
      {state.message && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            state.ok
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
