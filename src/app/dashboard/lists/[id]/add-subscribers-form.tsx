"use client";

import { useActionState } from "react";
import { addSubscribersAction, type AddSubscribersState } from "../../actions";

const initial: AddSubscribersState = { error: null, message: null };

export function AddSubscribersForm({ listId }: { listId: string }) {
  const [state, formAction, pending] = useActionState(
    addSubscribersAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="list_id" value={listId} />
      <textarea
        name="emails"
        rows={3}
        required
        placeholder="alice@example.com, bob@example.com&#10;One per line or comma-separated"
        className="input"
      />
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          name="skip_confirmation"
          className="h-4 w-4 rounded border-white/15 text-brand-600"
        />
        Add as already confirmed (skip the confirmation email)
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add subscribers"}
        </button>
        <span className="text-xs text-slate-400">
          By default, each person gets a confirmation email and must opt in.
        </span>
      </div>
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {!state.error && state.message && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.message}
        </p>
      )}
    </form>
  );
}
