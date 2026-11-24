"use client";

import { useActionState } from "react";
import { createMessageAction, type ComposeState } from "../../../actions";

const initial: ComposeState = { error: null };

export function ComposeForm({ listId }: { listId: string }) {
  const [state, formAction, pending] = useActionState(
    createMessageAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="list_id" value={listId} />
      <div>
        <label htmlFor="subject" className="label">
          Subject
        </label>
        <input id="subject" name="subject" required className="input" />
      </div>
      <div>
        <label htmlFor="body_text" className="label">
          Message
        </label>
        <textarea
          id="body_text"
          name="body_text"
          rows={12}
          required
          className="input font-mono text-sm"
          placeholder="Write your announcement…"
        />
        <p className="mt-1 text-xs text-slate-400">
          An unsubscribe footer is added automatically to every email.
        </p>
      </div>
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save draft"}
      </button>
    </form>
  );
}
