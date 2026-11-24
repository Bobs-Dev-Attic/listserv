"use client";

import { deletePostAction } from "@/app/groups/actions";

export function DeletePostButton({
  messageId,
  slug,
  isRoot,
}: {
  messageId: string;
  slug: string;
  isRoot: boolean;
}) {
  return (
    <form
      action={deletePostAction}
      onSubmit={(e) => {
        if (
          !confirm(
            isRoot
              ? "Delete this topic and all its replies?"
              : "Delete this reply?",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="message_id" value={messageId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="is_root" value={isRoot ? "1" : "0"} />
      <button
        className="text-slate-500 hover:text-rose-300"
        title="Delete (moderator)"
      >
        Delete
      </button>
    </form>
  );
}
