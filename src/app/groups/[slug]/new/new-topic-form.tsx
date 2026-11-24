"use client";

import { useActionState } from "react";
import { createTopicAction, type PostState } from "../../actions";

const initial: PostState = { error: null };

const inputCls =
  "w-full rounded-md border border-white/15 bg-[#2d3139] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-[#4a90d2] focus:outline-none";

export function NewTopicForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(createTopicAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label htmlFor="subject" className="mb-1 block text-sm text-slate-300">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          required
          autoFocus
          placeholder="What's this about?"
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="body_text" className="mb-1 block text-sm text-slate-300">
          Message
        </label>
        <textarea
          id="body_text"
          name="body_text"
          rows={10}
          required
          placeholder="Write your message to the group…"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-slate-500">
          This is emailed to the group and posted here.
        </p>
      </div>
      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        className="rounded bg-[#4a90d2] px-4 py-2 font-medium text-white hover:bg-[#3b7bbf] disabled:opacity-50"
        disabled={pending}
      >
        {pending ? "Posting…" : "Post topic"}
      </button>
    </form>
  );
}
