"use client";

import { useActionState } from "react";
import { addSubscribersAction } from "../../actions";

const initial = { error: null as string | null, added: 0 };

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
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add subscribers"}
        </button>
        <span className="text-xs text-gray-500">
          Added here are confirmed immediately (no opt-in email).
        </span>
      </div>
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {!state.error && state.added > 0 && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Processed {state.added} address{state.added === 1 ? "" : "es"}.
        </p>
      )}
    </form>
  );
}
