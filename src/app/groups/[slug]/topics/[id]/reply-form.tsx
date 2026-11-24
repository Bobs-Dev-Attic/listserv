"use client";

import { useActionState, useEffect, useRef } from "react";
import { replyAction, type PostState } from "../../../actions";

const initial: PostState = { error: null };

export function ReplyForm({ slug, topicId }: { slug: string; topicId: string }) {
  const [state, formAction, pending] = useActionState(replyAction, initial);
  const ref = useRef<HTMLFormElement>(null);

  // Clear the box after a successful post (the thread revalidates separately).
  useEffect(() => {
    if (!pending && state.error === null) ref.current?.reset();
  }, [pending, state]);

  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="topic_id" value={topicId} />
      <textarea
        name="body_text"
        rows={4}
        required
        placeholder="Write a reply…"
        className="input"
      />
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Posting…" : "Post reply"}
        </button>
      </div>
    </form>
  );
}
