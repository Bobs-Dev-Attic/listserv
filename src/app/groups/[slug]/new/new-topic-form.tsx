"use client";

import { useActionState } from "react";
import { createTopicAction, type PostState } from "../../actions";

const initial: PostState = { error: null };

export function NewTopicForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(createTopicAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label htmlFor="subject" className="label">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          required
          autoFocus
          placeholder="What's this about?"
          className="input"
        />
      </div>
      <div>
        <label htmlFor="body_text" className="label">
          Message
        </label>
        <textarea
          id="body_text"
          name="body_text"
          rows={10}
          required
          placeholder="Write your message to the group…"
          className="input"
        />
        <p className="mt-1 text-xs text-gray-500">
          This is emailed to the group and posted here.
        </p>
      </div>
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Posting…" : "Post topic"}
      </button>
    </form>
  );
}
