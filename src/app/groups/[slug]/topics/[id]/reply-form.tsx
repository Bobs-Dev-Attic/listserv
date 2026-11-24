"use client";

import { useActionState, useEffect, useRef } from "react";
import { replyAction, type PostState } from "../../../actions";

const initial: PostState = { error: null };

export function ReplyForm({ slug, topicId }: { slug: string; topicId: string }) {
  const [state, formAction, pending] = useActionState(replyAction, initial);
  const ref = useRef<HTMLFormElement>(null);

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
        className="w-full rounded-md border border-white/15 bg-[#2d3139] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-[#4a90d2] focus:outline-none"
      />
      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded bg-[#4a90d2] px-4 py-2 font-medium text-white hover:bg-[#3b7bbf] disabled:opacity-50"
          disabled={pending}
        >
          {pending ? "Posting…" : "Post reply"}
        </button>
      </div>
    </form>
  );
}
