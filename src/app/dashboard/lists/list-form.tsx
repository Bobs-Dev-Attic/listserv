"use client";

import { useActionState } from "react";
import {
  createListAction,
  updateListAction,
  type ListFormState,
} from "../actions";
import type { List } from "@/lib/database.types";

const initial: ListFormState = { error: null };

export function ListForm({ list }: { list?: List }) {
  const isEdit = Boolean(list);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateListAction : createListAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-5">
      {isEdit && <input type="hidden" name="id" value={list!.id} />}

      <div>
        <label htmlFor="name" className="label">
          List name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={list?.name}
          placeholder="Neighborhood Announcements"
          className="input"
        />
      </div>

      {!isEdit && (
        <div>
          <label htmlFor="slug" className="label">
            URL slug <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="slug"
            name="slug"
            placeholder="auto-generated from name"
            className="input"
          />
          <p className="mt-1 text-xs text-gray-500">
            Public page will be at <code>/lists/your-slug</code>.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="description" className="label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={list?.description ?? ""}
          className="input"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className="label">
            List type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={list?.type ?? "broadcast"}
            className="input"
          >
            <option value="broadcast">Broadcast (announcements)</option>
            <option value="discussion">Discussion</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div>
          <label htmlFor="posting_policy" className="label">
            Who can post
          </label>
          <select
            id="posting_policy"
            name="posting_policy"
            defaultValue={list?.posting_policy ?? "admins"}
            className="input"
          >
            <option value="admins">Admins only</option>
            <option value="subscribers">Any confirmed subscriber</option>
            <option value="moderated">Subscribers (moderated)</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="reply_to" className="label">
          Reply-to address <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="reply_to"
          name="reply_to"
          type="email"
          defaultValue={list?.reply_to ?? ""}
          placeholder="list@yourdomain.com"
          className="input"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked={list?.is_public ?? true}
          className="h-4 w-4 rounded border-gray-300 text-brand-600"
        />
        Public — show on the directory and allow open signup
      </label>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create list"}
        </button>
      </div>
    </form>
  );
}
