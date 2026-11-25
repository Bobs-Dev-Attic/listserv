"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { displayName } from "@/lib/display";
import {
  setUserRoleAction,
  setUserStatusAction,
  setUserModerationAction,
} from "../actions";
import { savePrefsAction } from "./prefs";

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  moderated: boolean;
  created_at: string;
}

type ColKey = "user" | "email" | "role" | "status" | "joined" | "actions";
interface Column {
  key: ColKey;
  label: string;
  type: "text" | "role" | "status" | "date" | "actions";
  width: number;
  menu: boolean;
}

const COLUMNS: Column[] = [
  { key: "user", label: "User", type: "text", width: 240, menu: true },
  { key: "email", label: "Email", type: "text", width: 240, menu: true },
  { key: "role", label: "Role", type: "role", width: 120, menu: true },
  { key: "status", label: "Status", type: "status", width: 120, menu: true },
  { key: "joined", label: "Joined", type: "date", width: 140, menu: true },
  { key: "actions", label: "", type: "actions", width: 170, menu: false },
];

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  pending: "bg-amber-500/15 text-amber-300",
  blocked: "bg-rose-500/15 text-rose-300",
};

export interface TablePrefs {
  widths?: Partial<Record<ColKey, number>>;
  sort?: { key: ColKey; dir: "asc" | "desc" } | null;
  filters?: Partial<Record<ColKey, string>>;
  search?: string;
}

export function UsersTable({
  users,
  currentUserId,
  initialPrefs,
}: {
  users: UserRow[];
  currentUserId: string;
  initialPrefs: TablePrefs;
}) {
  const [widths, setWidths] = useState<Record<ColKey, number>>(() => {
    const w = {} as Record<ColKey, number>;
    for (const c of COLUMNS) w[c.key] = initialPrefs.widths?.[c.key] ?? c.width;
    return w;
  });
  const [sort, setSort] = useState<TablePrefs["sort"]>(initialPrefs.sort ?? null);
  const [filters, setFilters] = useState<Partial<Record<ColKey, string>>>(
    initialPrefs.filters ?? {},
  );
  const [search, setSearch] = useState(initialPrefs.search ?? "");
  const [openMenu, setOpenMenu] = useState<ColKey | null>(null);

  // --- persist (debounced), skipping the initial mount ---
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      savePrefsAction("users_table", { widths, sort, filters, search }).catch(
        () => {},
      );
    }, 500);
    return () => clearTimeout(t);
  }, [widths, sort, filters, search]);

  // --- column resize ---
  const resizing = useRef<{ key: ColKey; startX: number; startW: number } | null>(
    null,
  );
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const r = resizing.current;
      if (!r) return;
      const next = Math.max(70, r.startW + (e.clientX - r.startX));
      setWidths((w) => ({ ...w, [r.key]: next }));
    }
    function onUp() {
      resizing.current = null;
      document.body.style.cursor = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // --- derive visible rows ---
  const name = (u: UserRow) => displayName(u.email, u.full_name);
  const s = search.trim().toLowerCase();
  let rows = users.filter((u) => {
    if (s && !name(u).toLowerCase().includes(s) && !u.email.toLowerCase().includes(s))
      return false;
    const fu = (filters.user ?? "").toLowerCase();
    if (fu && !name(u).toLowerCase().includes(fu)) return false;
    const fe = (filters.email ?? "").toLowerCase();
    if (fe && !u.email.toLowerCase().includes(fe)) return false;
    const fr = filters.role ?? "";
    if (fr && u.role !== fr) return false;
    const fs = filters.status ?? "";
    if (fs && u.status !== fs) return false;
    return true;
  });
  if (sort) {
    const dir = sort.dir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      let av = "";
      let bv = "";
      if (sort.key === "user") {
        av = name(a);
        bv = name(b);
      } else if (sort.key === "email") {
        av = a.email;
        bv = b.email;
      } else if (sort.key === "role") {
        av = a.role;
        bv = b.role;
      } else if (sort.key === "status") {
        av = a.status;
        bv = b.status;
      } else if (sort.key === "joined") {
        av = a.created_at;
        bv = b.created_at;
      }
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-400">
          {rows.length} of {users.length} users
          {(activeFilterCount > 0 || sort) && (
            <button
              type="button"
              onClick={() => {
                setFilters({});
                setSort(null);
                setSearch("");
              }}
              className="ml-3 text-slate-400 hover:text-white"
            >
              Reset view
            </button>
          )}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          className="w-56 rounded-md border border-white/15 bg-[#2d3139] px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#4a90d2] focus:outline-none"
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            {COLUMNS.map((c) => (
              <col key={c.key} style={{ width: widths[c.key] }} />
            ))}
          </colgroup>
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} className="relative px-4 py-2 font-medium">
                  <div className="flex items-center gap-1">
                    <span className="truncate">{c.label}</span>
                    {sort?.key === c.key && (
                      <span className="text-[#5b9bd5]">
                        {sort.dir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                    {filters[c.key] && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4a90d2]" />
                    )}
                    {c.menu && (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenu((m) => (m === c.key ? null : c.key))
                        }
                        className="ml-auto rounded px-1 text-slate-400 hover:bg-white/10 hover:text-white"
                        aria-label={`${c.label} options`}
                      >
                        ⋮
                      </button>
                    )}
                  </div>

                  {openMenu === c.key && (
                    <ColumnMenu
                      column={c}
                      filterValue={filters[c.key] ?? ""}
                      onSort={(dir) => {
                        setSort({ key: c.key, dir });
                        setOpenMenu(null);
                      }}
                      onFilter={(v) =>
                        setFilters((f) => ({ ...f, [c.key]: v }))
                      }
                      onClose={() => setOpenMenu(null)}
                    />
                  )}

                  {/* resize handle */}
                  <span
                    onMouseDown={(e) => {
                      resizing.current = {
                        key: c.key,
                        startX: e.clientX,
                        startW: widths[c.key],
                      };
                      document.body.style.cursor = "col-resize";
                      e.preventDefault();
                    }}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none hover:bg-[#4a90d2]/40"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-slate-400">
                  No users match.
                </td>
              </tr>
            ) : (
              rows.map((u) => {
                const nm = name(u);
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar url={u.avatar_url} name={nm} size={28} />
                        <span className="truncate font-medium text-slate-100">
                          {nm}
                        </span>
                      </div>
                    </td>
                    <td className="truncate px-4 py-2 text-slate-300">{u.email}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`badge ${
                          u.role === "admin"
                            ? "bg-brand-50 text-brand-700"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`badge ${STATUS_BADGE[u.status] ?? "bg-white/10 text-slate-300"}`}
                        >
                          {u.status}
                        </span>
                        {u.moderated && (
                          <span
                            className="badge bg-amber-500/15 text-amber-300"
                            title="Posts held for approval across all groups"
                          >
                            moderated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      {u.id === currentUserId ? (
                        <div className="flex justify-end">
                          <span className="text-xs text-slate-500">You</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                          {u.role === "admin" ? (
                            <form action={setUserRoleAction}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="role" value="member" />
                              <button className="text-xs font-medium text-slate-300 hover:underline">
                                Make member
                              </button>
                            </form>
                          ) : (
                            <form action={setUserRoleAction}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="role" value="admin" />
                              <button className="text-xs font-medium text-[#5b9bd5] hover:underline">
                                Make admin
                              </button>
                            </form>
                          )}
                          {u.status === "pending" && (
                            <form action={setUserStatusAction}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="status" value="active" />
                              <button className="text-xs font-medium text-emerald-300 hover:underline">
                                Approve
                              </button>
                            </form>
                          )}
                          {u.status === "blocked" ? (
                            <form action={setUserStatusAction}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="status" value="active" />
                              <button className="text-xs font-medium text-emerald-300 hover:underline">
                                Unblock
                              </button>
                            </form>
                          ) : (
                            <form action={setUserStatusAction}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="status" value="blocked" />
                              <button className="text-xs font-medium text-rose-300 hover:underline">
                                Block
                              </button>
                            </form>
                          )}
                          <form action={setUserModerationAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <input
                              type="hidden"
                              name="moderated"
                              value={u.moderated ? "0" : "1"}
                            />
                            <button className="text-xs font-medium text-amber-300 hover:underline">
                              {u.moderated ? "Unmoderate" : "Moderate"}
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ColumnMenu({
  column,
  filterValue,
  onSort,
  onFilter,
  onClose,
}: {
  column: Column;
  filterValue: string;
  onSort: (dir: "asc" | "desc") => void;
  onFilter: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        className="absolute right-2 top-9 z-20 w-56 rounded-md border border-white/10 bg-[#343842] p-2 text-xs shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onSort("asc")}
          className="block w-full rounded px-2 py-1.5 text-left text-slate-200 hover:bg-white/10"
        >
          Sort ascending
        </button>
        <button
          type="button"
          onClick={() => onSort("desc")}
          className="block w-full rounded px-2 py-1.5 text-left text-slate-200 hover:bg-white/10"
        >
          Sort descending
        </button>

        {column.type !== "date" && (
          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="mb-1 px-1 uppercase tracking-wide text-slate-500">
              Filter
            </div>
            {column.type === "role" || column.type === "status" ? (
              <div className="flex gap-1">
                {(column.type === "role"
                  ? ["", "admin", "member"]
                  : ["", "active", "pending", "blocked"]
                ).map((v) => (
                  <button
                    key={v || "all"}
                    type="button"
                    onClick={() => onFilter(v)}
                    className={`flex-1 rounded px-2 py-1 ${
                      filterValue === v
                        ? "bg-[#4a90d2] text-white"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {v === "" ? "All" : v}
                  </button>
                ))}
              </div>
            ) : (
              <input
                autoFocus
                value={filterValue}
                onChange={(e) => onFilter(e.target.value)}
                placeholder="Contains…"
                className="w-full rounded border border-white/15 bg-[#2d3139] px-2 py-1 text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            )}
            {filterValue && (
              <button
                type="button"
                onClick={() => onFilter("")}
                className="mt-1 text-slate-400 hover:text-white"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
