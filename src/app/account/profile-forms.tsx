"use client";

import { useActionState } from "react";
import {
  updateNameAction,
  updateEmailAction,
  type FormState,
} from "./actions";

const initial: FormState = { error: null, message: null };

function Feedback({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
        {state.message}
      </p>
    );
  }
  return null;
}

export function NameForm({ fullName }: { fullName: string }) {
  const [state, action, pending] = useActionState(updateNameAction, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="full_name" className="label">
          Display name
        </label>
        <input
          id="full_name"
          name="full_name"
          defaultValue={fullName}
          placeholder="Your name"
          className="input"
        />
      </div>
      <Feedback state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}

export function EmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(updateEmailAction, initial);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="email" className="label">
          Email (your sign-in)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={email}
          className="input"
        />
        <p className="mt-1 text-xs text-slate-500">
          Changing this sends a confirmation link to the new address; it takes
          effect once you confirm.
        </p>
      </div>
      <Feedback state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Change email"}
      </button>
    </form>
  );
}
