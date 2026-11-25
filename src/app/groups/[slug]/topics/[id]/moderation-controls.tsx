"use client";

import { approvePostAction, rejectPostAction } from "@/app/groups/actions";

export function ModerationControls({
  messageId,
  slug,
  topicId,
}: {
  messageId: string;
  slug: string;
  topicId: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <form action={approvePostAction}>
        <input type="hidden" name="message_id" value={messageId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="topic_id" value={topicId} />
        <button className="rounded bg-emerald-600/80 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-600">
          Approve
        </button>
      </form>
      <form
        action={rejectPostAction}
        onSubmit={(e) => {
          if (!confirm("Reject this post? It won't be delivered or shown.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="message_id" value={messageId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="topic_id" value={topicId} />
        <button className="rounded border border-white/15 px-2 py-0.5 text-xs font-medium text-slate-200 hover:bg-white/10">
          Reject
        </button>
      </form>
    </div>
  );
}
