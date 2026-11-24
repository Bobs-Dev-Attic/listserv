"use client";

import { useActionState } from "react";
import { sendTestEmailAction, type TestEmailState } from "../actions";

const initial: TestEmailState = { error: null, message: null };

export function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const [state, action, pending] = useActionState(sendTestEmailAction, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="to" className="label">
          Send a test to
        </label>
        <input
          id="to"
          name="to"
          type="email"
          defaultValue={defaultTo}
          className="input"
        />
      </div>
      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
          {state.message}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Send test email"}
      </button>
    </form>
  );
}
