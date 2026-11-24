import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { emailProvider, isEmailConfigured } from "@/lib/email";
import { ServersManager, type ServerRow } from "./servers-manager";
import { TestEmailForm } from "./test-email-form";

export const dynamic = "force-dynamic";

export default async function SmtpPage() {
  const me = await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("email_servers")
    .select("id, name, host, port, secure, username, from_email, is_active")
    .order("created_at");
  const servers = (data as ServerRow[]) ?? [];
  const active = servers.find((s) => s.is_active) ?? null;

  const configured = await isEmailConfigured();
  const sourceLabel = active
    ? `${active.name} (SMTP server)`
    : `env: ${emailProvider()}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Email / SMTP</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage the mail servers used for confirmations, broadcasts, and
          digests. The <strong>active</strong> server is used; if none is
          active, deployment env vars are used as a fallback.
        </p>
      </div>

      <section className="card p-6">
        <h2 className="mb-3 font-semibold text-slate-100">Status</h2>
        <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
          <dt className="text-slate-400">Sending via</dt>
          <dd className="text-slate-200">{sourceLabel}</dd>
          <dt className="text-slate-400">Configured</dt>
          <dd>
            {configured ? (
              <span className="badge bg-green-100 text-green-800">yes</span>
            ) : (
              <span className="badge bg-amber-100 text-amber-800">
                not configured
              </span>
            )}
          </dd>
        </dl>
      </section>

      <section className="card p-6">
        <ServersManager servers={servers} />
        <p className="mt-4 text-xs text-slate-500">
          Passwords are stored in your database (admin-only access) and used by
          the server-side send worker. For inbox delivery, send from a domain
          you&apos;ve verified (DKIM/SPF/DMARC), or use Gmail SMTP with your own
          address.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="mb-3 font-semibold text-slate-100">Send a test</h2>
        <TestEmailForm defaultTo={me.email} />
      </section>
    </div>
  );
}
