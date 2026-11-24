"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveServerAction,
  setActiveServerAction,
  deleteServerAction,
  type SaveServerState,
} from "./actions";

export interface ServerRow {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  from_email: string;
  is_active: boolean;
}

export function ServersManager({ servers }: { servers: ServerRow[] }) {
  const [editing, setEditing] = useState<ServerRow | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">SMTP servers</h2>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="btn-primary px-3 py-1.5"
        >
          Add server
        </button>
      </div>

      {servers.length === 0 ? (
        <p className="rounded-md border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
          No SMTP servers yet. Add one, then set it active. (Until then, the
          deployment env vars are used, if set.)
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Host</th>
                <th className="px-4 py-2 font-medium">From</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {servers.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-medium text-slate-100">{s.name}</td>
                  <td className="px-4 py-2 text-slate-300">
                    {s.host}:{s.port}
                    {s.secure ? " (TLS)" : ""}
                  </td>
                  <td className="px-4 py-2 text-slate-300">{s.from_email}</td>
                  <td className="px-4 py-2">
                    {s.is_active ? (
                      <span className="badge bg-green-100 text-green-800">active</span>
                    ) : (
                      <span className="badge bg-white/10 text-slate-400">off</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-3">
                      <form action={setActiveServerAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input
                          type="hidden"
                          name="activate"
                          value={s.is_active ? "false" : "true"}
                        />
                        <button className="text-xs font-medium text-[#5b9bd5] hover:underline">
                          {s.is_active ? "Stop using" : "Use this"}
                        </button>
                      </form>
                      <button
                        type="button"
                        onClick={() => setEditing(s)}
                        className="text-slate-400 hover:text-white"
                        aria-label={`Edit ${s.name}`}
                        title="Edit"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                      <form action={deleteServerAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="text-xs font-medium text-red-300 hover:underline">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ServerDialog
          server={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

const initial: SaveServerState = { error: null, ok: false };

function ServerDialog({
  server,
  onClose,
}: {
  server: ServerRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveServerAction, initial);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-white/10 bg-[#343842] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-slate-100">
          {server ? "Edit SMTP server" : "Add SMTP server"}
        </h3>
        <form action={action} className="space-y-3">
          {server && <input type="hidden" name="id" value={server.id} />}
          <div>
            <label className="label">Name</label>
            <input name="name" required defaultValue={server?.name ?? ""} placeholder="Brevo, Gmail, SES…" className="input" />
          </div>
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <div>
              <label className="label">Host</label>
              <input name="host" required defaultValue={server?.host ?? ""} placeholder="smtp.example.com" className="input" />
            </div>
            <div>
              <label className="label">Port</label>
              <input name="port" type="number" defaultValue={server?.port ?? 587} className="input" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="secure" defaultChecked={server?.secure ?? false} className="h-4 w-4 rounded border-white/15" />
            Use TLS (port 465). Leave off for STARTTLS on 587.
          </label>
          <div>
            <label className="label">Username</label>
            <input name="username" required defaultValue={server?.username ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Password {server && <span className="text-slate-500">(leave blank to keep)</span>}</label>
            <input name="password" type="password" placeholder={server ? "••••••••" : ""} className="input" autoComplete="new-password" />
          </div>
          <div>
            <label className="label">From</label>
            <input name="from_email" required defaultValue={server?.from_email ?? ""} placeholder="GFCA <you@example.com>" className="input" />
          </div>
          {state.error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
