import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Role, List, Profile } from "@/lib/database.types";
import { displayName } from "@/lib/display";
import { RolesManager, type AssignmentRow, type UserOption } from "./roles-manager";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: roleRows }, { data: assignRows }, { data: userRows }, { data: listRows }] =
    await Promise.all([
      supabase.from("roles").select("*").order("name"),
      supabase
        .from("role_assignments")
        .select("id, role_id, profile_id, list_id, roles(name), profiles(email, full_name), lists(name)")
        .order("created_at"),
      supabase.from("profiles").select("id, email, full_name").order("email"),
      supabase.from("lists").select("id, name").order("name"),
    ]);

  const roles = (roleRows as Role[]) ?? [];
  const lists = ((listRows as Pick<List, "id" | "name">[]) ?? []).map((l) => ({
    id: l.id,
    name: l.name,
  }));
  const users: UserOption[] = (
    (userRows as Pick<Profile, "id" | "email" | "full_name">[]) ?? []
  ).map((u) => ({ id: u.id, label: displayName(u.email, u.full_name), email: u.email }));

  type RawAssign = {
    id: string;
    role_id: string;
    profile_id: string;
    list_id: string | null;
    roles: { name: string } | null;
    profiles: { email: string; full_name: string | null } | null;
    lists: { name: string } | null;
  };
  const assignments: AssignmentRow[] = ((assignRows as unknown as RawAssign[]) ?? []).map((a) => ({
    id: a.id,
    roleName: a.roles?.name ?? "—",
    userLabel: a.profiles
      ? displayName(a.profiles.email, a.profiles.full_name)
      : a.profile_id,
    scope: a.list_id ? (a.lists?.name ?? "a list") : "Global",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Roles &amp; permissions</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create custom roles that let members moderate topics, manage lists, send
          broadcasts, and approve or block users. Assign a role to someone globally
          or scoped to a single list.
        </p>
      </div>

      <RolesManager
        roles={roles}
        assignments={assignments}
        users={users}
        lists={lists}
      />
    </div>
  );
}
