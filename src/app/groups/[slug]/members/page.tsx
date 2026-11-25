import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { List, DeliveryMode } from "@/lib/database.types";
import { GroupSidebar } from "@/components/group-sidebar";
import { setMemberModerationAction } from "@/app/groups/actions";

export const dynamic = "force-dynamic";

type MemberRow = {
  id: string;
  email: string;
  status: string;
  moderated: boolean;
  delivery_mode: DeliveryMode;
  subscribed_at: string;
};

const statusStyle: Record<string, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-300",
  pending: "bg-amber-500/15 text-amber-300",
  unsubscribed: "bg-white/10 text-slate-400",
  bounced: "bg-rose-500/15 text-rose-300",
};

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: listRow } = await supabase
    .from("lists")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  const list = listRow as List | null;
  if (!list) notFound();

  // Gate: admins + holders of moderate_members on this list.
  const { data: canMod } = await supabase.rpc("user_has_permission", {
    p_perm: "moderate_members",
    p_list: list.id,
  });
  if (canMod !== true) redirect(`/groups/${slug}`);

  const { data: membership } = await supabase
    .from("subscriptions")
    .select("delivery_mode")
    .eq("list_id", list.id)
    .eq("profile_id", user!.id)
    .maybeSingle();
  const deliveryMode = (membership as { delivery_mode: DeliveryMode } | null)
    ?.delivery_mode;

  const { data: memberRows } = await supabase.rpc("list_moderation_members", {
    p_list: list.id,
  });
  const members = (memberRows as MemberRow[]) ?? [];
  const moderatedCount = members.filter((m) => m.moderated).length;

  const canPost =
    (list.type === "discussion" || list.type === "both") &&
    list.posting_policy === "subscribers";

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <GroupSidebar
        slug={slug}
        listId={list.id}
        name={list.name}
        canPost={canPost}
        active="members"
        deliveryMode={deliveryMode}
        canModerateMembers
      />

      <div className="min-w-0 flex-1 px-4 py-5 md:px-8">
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/groups" className="hover:text-white">
            Groups
          </Link>
          <span>/</span>
          <Link href={`/groups/${slug}`} className="hover:text-white">
            {list.name}
          </Link>
          <span>/</span>
          <span>Members</span>
        </div>

        <h1 className="text-2xl font-bold text-white">Members</h1>
        <p className="mb-4 text-sm text-slate-400">
          {members.length} member{members.length === 1 ? "" : "s"}
          {moderatedCount > 0 && <> · {moderatedCount} moderated</>}. A moderated
          member&apos;s posts are held for approval before they&apos;re delivered.
        </p>

        <div className="overflow-hidden rounded-lg border border-white/10">
          {members.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">No members yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Posting</th>
                  <th className="px-4 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2 font-medium text-slate-100">
                      {m.email}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`badge ${statusStyle[m.status] ?? "bg-white/10 text-slate-300"}`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {m.moderated ? (
                        <span className="badge bg-amber-500/15 text-amber-300">
                          moderated
                        </span>
                      ) : (
                        <span className="text-slate-500">unrestricted</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <form action={setMemberModerationAction}>
                        <input type="hidden" name="sub_id" value={m.id} />
                        <input type="hidden" name="slug" value={slug} />
                        <input
                          type="hidden"
                          name="moderated"
                          value={m.moderated ? "0" : "1"}
                        />
                        <button className="text-xs font-medium text-amber-300 hover:underline">
                          {m.moderated ? "Unmoderate" : "Moderate"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
