import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: string;
  at: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  summary: string | null;
  ip: string | null;
  user_agent: string | null;
}

const actionStyle: Record<string, string> = {
  login: "bg-blue-100 text-blue-800",
};
function actionClass(a: string) {
  if (actionStyle[a]) return actionStyle[a];
  if (a.startsWith("email.")) return "bg-green-100 text-green-800";
  if (a.startsWith("user.")) return "bg-purple-100 text-purple-800";
  if (a.startsWith("list.")) return "bg-amber-100 text-amber-800";
  if (a.startsWith("smtp.")) return "bg-cyan-100 text-cyan-800";
  return "bg-white/10 text-slate-300";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const action = (sp.action ?? "").trim();

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("id, at, actor_email, action, target_type, summary, ip, user_agent")
    .order("at", { ascending: false })
    .limit(300);
  if (action) query = query.eq("action", action);
  if (q) {
    const safe = q.replace(/[%,()*]/g, " ").trim();
    if (safe) {
      query = query.or(`summary.ilike.%${safe}%,actor_email.ilike.%${safe}%`);
    }
  }
  const { data } = await query;
  const rows = (data as AuditRow[]) ?? [];

  const categories = [
    { value: "", label: "All events" },
    { value: "login", label: "Logins" },
    { value: "email.broadcast", label: "Broadcasts" },
    { value: "email.digest", label: "Digests" },
    { value: "email.confirmation", label: "Confirmations" },
    { value: "email.test", label: "Test emails" },
    { value: "list.create", label: "List created" },
    { value: "list.update", label: "List updated" },
    { value: "list.delete", label: "List deleted" },
    { value: "user.role_change", label: "Role changes" },
    { value: "subscription.add", label: "Subscribers added" },
    { value: "smtp.save", label: "SMTP saved" },
    { value: "smtp.activate", label: "SMTP activated" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Audit log</h1>
          <p className="mt-1 text-sm text-slate-400">
            Changes, email sends, and logins (with IP + browser). Most recent
            first, up to 300 events.
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <select
            name="action"
            defaultValue={action}
            className="rounded-md border border-white/15 bg-[#2d3139] px-2 py-1.5 text-sm text-slate-100"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search…"
            className="w-44 rounded-md border border-white/15 bg-[#2d3139] px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500"
          />
          <button className="btn-primary px-3 py-1.5">Filter</button>
          {(q || action) && (
            <Link href="/dashboard/audit" className="text-sm text-slate-400 hover:text-white">
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Actor</th>
              <th className="px-4 py-2 font-medium">Event</th>
              <th className="px-4 py-2 font-medium">Details</th>
              <th className="px-4 py-2 font-medium">IP</th>
              <th className="px-4 py-2 font-medium">Browser</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No matching events.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-400">
                    {new Date(r.at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-slate-300">
                    {r.actor_email ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`badge ${actionClass(r.action)}`}>
                      {r.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-300">{r.summary ?? ""}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-400">
                    {r.ip ?? ""}
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-2 text-slate-500" title={r.user_agent ?? ""}>
                    {r.user_agent ?? ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
