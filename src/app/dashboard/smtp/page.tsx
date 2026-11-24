import { requireAdmin } from "@/lib/auth";
import { emailProvider, isEmailConfigured } from "@/lib/email";
import { TestEmailForm } from "./test-email-form";

export const dynamic = "force-dynamic";

export default async function SmtpPage() {
  const me = await requireAdmin();
  const provider = emailProvider();
  const configured = isEmailConfigured();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Email / SMTP</h1>
        <p className="mt-1 text-sm text-slate-400">
          Outbound email (confirmations, broadcasts, digests) is configured via
          environment variables on the deployment.
        </p>
      </div>

      <section className="card p-6">
        <h2 className="mb-3 font-semibold text-slate-100">Status</h2>
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-slate-400">Provider</dt>
          <dd className="text-slate-200">{provider}</dd>
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
        {!configured && (
          <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Set <code>LISTSERV_EMAIL_FROM</code> and your provider keys
            (<code>LISTSERV_RESEND_API_KEY</code>, or{" "}
            <code>LISTSERV_SMTP_HOST/USER/PASS</code>) in the deployment
            environment. Messages queue safely until this is set.
          </p>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-3 font-semibold text-slate-100">Send a test</h2>
        <TestEmailForm defaultTo={me.email} />
      </section>

      <section className="card p-6 text-sm text-slate-300">
        <h2 className="mb-3 font-semibold text-slate-100">Configuration</h2>
        <p className="mb-2">
          Environment variables (set in Vercel → Project → Settings →
          Environment Variables):
        </p>
        <pre className="overflow-x-auto rounded-md bg-black/30 p-3 text-xs text-slate-300">
{`LISTSERV_EMAIL_PROVIDER=smtp        # or "resend"
LISTSERV_EMAIL_FROM=GFCA <you@example.com>
# SMTP (Brevo / Gmail / SES / …)
LISTSERV_SMTP_HOST=smtp-relay.brevo.com
LISTSERV_SMTP_PORT=587
LISTSERV_SMTP_SECURE=false
LISTSERV_SMTP_USER=...
LISTSERV_SMTP_PASS=...
# or Resend
LISTSERV_RESEND_API_KEY=re_...`}
        </pre>
        <p className="mt-2 text-xs text-slate-500">
          Changes take effect on the next deployment. For inbox delivery, send
          from a domain you&apos;ve verified (DKIM/SPF/DMARC).
        </p>
      </section>
    </div>
  );
}
