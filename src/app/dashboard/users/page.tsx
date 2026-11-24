import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { Avatar } from "@/components/avatar";
import { displayName } from "@/lib/display";
import type { Profile } from "@/lib/database.types";
import { setUserRoleAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at");
  const users = (data as Profile[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Users</h1>
        <p className="mt-1 text-sm text-slate-400">
          Everyone with a sign-in account. Admins can manage lists, send
          messages, and promote others.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Joined</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {users.map((u) => {
              const name = displayName(u.email, u.full_name);
              return (
                <tr key={u.id}>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar url={u.avatar_url} name={name} size={28} />
                      <span className="font-medium text-slate-100">{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-300">{u.email}</td>
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
                  <td className="px-4 py-2 text-slate-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end">
                      {u.id === me.id ? (
                        <span className="text-xs text-slate-500">You</span>
                      ) : u.role === "admin" ? (
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
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
