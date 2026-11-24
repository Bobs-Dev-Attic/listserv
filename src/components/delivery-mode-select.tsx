"use client";

import { useRef } from "react";
import { setDeliveryModeAction } from "@/app/groups/actions";
import type { DeliveryMode } from "@/lib/database.types";

export function DeliveryModeSelect({
  listId,
  slug,
  mode,
}: {
  listId: string;
  slug: string;
  mode: DeliveryMode;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setDeliveryModeAction} className="px-3 py-2">
      <input type="hidden" name="list_id" value={listId} />
      <input type="hidden" name="slug" value={slug} />
      <label
        htmlFor="delivery-mode"
        className="mb-1 block text-xs uppercase tracking-wide text-slate-400"
      >
        Email delivery
      </label>
      <select
        id="delivery-mode"
        name="mode"
        defaultValue={mode}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full rounded border border-white/20 bg-[#223446] px-2 py-1.5 text-sm text-slate-100 focus:border-[#4a90d2] focus:outline-none"
      >
        <option value="each">Each message</option>
        <option value="digest">Daily digest</option>
        <option value="none">No email (web only)</option>
      </select>
    </form>
  );
}
