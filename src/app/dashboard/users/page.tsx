import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Profile } from "@/lib/database.types";
import { UsersTable, type UserRow, type TablePrefs } from "./users-table";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireAdmin();
  const supabase = await createClient();

  const [{ data: userRows }, { data: prefRow }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase
      .from("user_prefs")
      .select("value")
      .eq("profile_id", me.id)
      .eq("key", "users_table")
      .maybeSingle(),
  ]);

  const users = ((userRows as Profile[]) ?? []).map(
    (p): UserRow => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      role: p.role,
      status: p.status,
      moderated: p.moderated,
      created_at: p.created_at,
    }),
  );
  const initialPrefs = ((prefRow as { value: TablePrefs } | null)?.value ??
    {}) as TablePrefs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Users</h1>
        <p className="mt-1 text-sm text-slate-400">
          Everyone with a sign-in account. Drag column edges to resize, use each
          column&apos;s ⋮ menu to sort/filter, and search top-right — your view
          is saved to your account.
        </p>
      </div>

      <UsersTable users={users} currentUserId={me.id} initialPrefs={initialPrefs} />
    </div>
  );
}
