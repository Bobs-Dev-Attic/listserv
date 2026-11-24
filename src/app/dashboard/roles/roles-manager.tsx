"use client";

import { useActionState, useEffect, useState } from "react";
import { PERMISSIONS, permissionLabel } from "@/lib/permissions";
import type { Role } from "@/lib/database.types";
import {
  saveRoleAction,
  deleteRoleAction,
  assignRoleAction,
  unassignRoleAction,
  type RoleFormState,
} from "./actions";

export interface UserOption {
  id: string;
  label: string;
  email: string;
}
export interface AssignmentRow {
  id: string;
  roleName: string;
  userLabel: string;
  scope: string;
}

export function RolesManager({
  roles,
  assignments,
  users,
  lists,
}: {
  roles: Role[];
  assignments: AssignmentRow[];
  users: UserOption[];
  lists: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-8">
      {/* --- Roles --- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Roles</h2>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md bg-[#4a90d2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#3f7fbc]"
          >
            New role
          </button>
        </div>

        {roles.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-400">
            No custom roles yet. Create one to delegate moderation.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {roles.map((r) => (
              <div key={r.id} className="card flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-100">{r.name}</div>
                    {r.description && (
                      <div className="mt-0.5 text-sm text-slate-400">
                        {r.description}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      className="text-xs font-medium text-[#5b9bd5] hover:underline"
                    >
                      Edit
                    </button>
                    <form
                      action={deleteRoleAction}
                      onSubmit={(e) => {
                        if (!confirm(`Delete role "${r.name}"? This removes its assignments.`))
                          e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={r.id} />
                      <button className="text-xs font-medium text-rose-300 hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.permissions.length === 0 ? (
                    <span className="text-xs text-slate-500">No permissions</span>
                  ) : (
                    r.permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-300"
                      >
                        {permissionLabel(p)}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- Assignments --- */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100">Assignments</h2>

        {roles.length === 0 ? (
          <p className="text-sm text-slate-400">Create a role first.</p>
        ) : (
          <form
            action={assignRoleAction}
            className="card flex flex-wrap items-end gap-3 p-4"
          >
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Member
              <select
                name="profile_id"
                required
                className="w-56 rounded-md border border-white/15 bg-[#2d3139] px-3 py-1.5 text-sm text-slate-100 focus:border-[#4a90d2] focus:outline-none"
              >
                <option value="">Select a member…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label} ({u.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Role
              <select
                name="role_id"
                required
                className="w-44 rounded-md border border-white/15 bg-[#2d3139] px-3 py-1.5 text-sm text-slate-100 focus:border-[#4a90d2] focus:outline-none"
              >
                <option value="">Select a role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Scope
              <select
                name="list_id"
                className="w-48 rounded-md border border-white/15 bg-[#2d3139] px-3 py-1.5 text-sm text-slate-100 focus:border-[#4a90d2] focus:outline-none"
              >
                <option value="">Global (all lists)</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="rounded-md bg-[#4a90d2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#3f7fbc]">
              Assign
            </button>
          </form>
        )}

        {assignments.length > 0 && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Scope</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 text-slate-100">{a.userLabel}</td>
                    <td className="px-4 py-2 text-slate-300">{a.roleName}</td>
                    <td className="px-4 py-2 text-slate-400">{a.scope}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={unassignRoleAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="text-xs font-medium text-rose-300 hover:underline">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(creating || editing) && (
        <RoleDialog
          role={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function RoleDialog({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const [state, formAction] = useActionState<RoleFormState, FormData>(
    saveRoleAction,
    { error: null, ok: false },
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold text-slate-100">
          {role ? "Edit role" : "New role"}
        </h3>
        <form action={formAction} className="mt-4 space-y-4">
          {role && <input type="hidden" name="id" value={role.id} />}
          <label className="block text-sm text-slate-300">
            Name
            <input
              name="name"
              defaultValue={role?.name ?? ""}
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-white/15 bg-[#2d3139] px-3 py-2 text-slate-100 focus:border-[#4a90d2] focus:outline-none"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Description
            <input
              name="description"
              defaultValue={role?.description ?? ""}
              placeholder="Optional"
              className="mt-1 w-full rounded-md border border-white/15 bg-[#2d3139] px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-[#4a90d2] focus:outline-none"
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm text-slate-300">Permissions</legend>
            {PERMISSIONS.map((p) => (
              <label key={p.key} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="permissions"
                  value={p.key}
                  defaultChecked={role?.permissions.includes(p.key) ?? false}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-[#2d3139] accent-[#4a90d2]"
                />
                <span>
                  <span className="font-medium text-slate-100">{p.label}</span>
                  <span className="block text-xs text-slate-400">{p.help}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {state.error && (
            <p className="text-sm text-rose-300">{state.error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button className="rounded-md bg-[#4a90d2] px-4 py-2 text-sm font-medium text-white hover:bg-[#3f7fbc]">
              {role ? "Save changes" : "Create role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
