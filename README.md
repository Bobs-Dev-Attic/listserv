# ListServ

A mailing-list web app built on **Next.js (App Router)**, **Supabase** (Postgres +
Auth + RLS), and **Vercel**. Supports both **broadcast** announcement lists and
**discussion** lists, with double opt-in subscriptions and a provider-agnostic
send queue.

## Features

- **Public directory** of lists + per-list subscribe pages (double opt-in).
- **Admin dashboard**: create/edit lists, manage subscribers (add, import,
  confirm, unsubscribe, remove), compose and send messages.
- **Auth**: admin login + public signup. The **first account to sign up becomes
  the admin** automatically; everyone after is a member.
- **Confirm / unsubscribe** flows with per-subscription tokens and a
  `List-Unsubscribe` header on every email.
- **Delivery queue**: every send fans out to one `deliveries` row per recipient,
  so nothing is lost and sends are retryable. Provider-agnostic — plug in email
  whenever you're ready.
- **Row Level Security** on every table.

## Architecture

| Piece | Where |
| --- | --- |
| Database schema | `supabase/migrations/*.sql` |
| Supabase clients | `src/lib/supabase/` (`client` browser, `server` session, `admin` service-role) |
| Auth helpers | `src/lib/auth.ts`, `src/middleware.ts` |
| Email (pluggable) | `src/lib/email.ts` |
| Send worker | `src/lib/send-worker.ts`, cron at `src/app/api/send/route.ts` |
| Public pages | `src/app/page.tsx`, `src/app/lists/[slug]`, `confirm`, `unsubscribe` |
| Admin dashboard | `src/app/dashboard/**` |

### Data model

- **profiles** — one per auth user (`admin` | `member`).
- **lists** — `type` (`broadcast` | `discussion` | `both`), `posting_policy`,
  `is_public`.
- **subscriptions** — `(list, email)` with `status`
  (`pending` → `confirmed` → `unsubscribed`/`bounced`) and confirm/unsubscribe tokens.
- **messages** — a broadcast or post; `status` (`draft` → `queued` → `sending` → `sent`).
- **deliveries** — one row per recipient per message = the send queue.

## Setup

### 1. Database (Supabase)

Apply the migrations to your project (`urhijvyvfilkzbcfnazj`) in order. Either
paste each file into **Supabase Dashboard → SQL Editor**, or use the CLI:

```bash
supabase link --project-ref urhijvyvfilkzbcfnazj
supabase db push
```

Migrations:
- `0001_init.sql` — tables, the new-user/first-admin trigger, `enqueue_message()`.
- `0002_rls.sql` — Row Level Security policies.

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in from
**Supabase → Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://urhijvyvfilkzbcfnazj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # anon / publishable key
SUPABASE_SERVICE_ROLE_KEY=...            # SERVER ONLY — bypasses RLS
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> The service-role key is used only in server code (public subscribe/confirm/
> unsubscribe flows and the send worker). Never expose it to the browser.

### 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Sign up** to create the first (admin)
account, then head to **/dashboard**.

> If Supabase email confirmation is enabled (Auth → Providers → Email), the first
> admin must confirm via the Supabase-sent email before logging in. For quick
> local setup you can disable "Confirm email" in that settings page.

### 4. Deploy to Vercel

1. Import this repo into Vercel.
2. Add the same env vars (set `NEXT_PUBLIC_SITE_URL` to your production URL).
3. Add **`CRON_SECRET`** (any random string) to secure the cron endpoint.
4. Deploy. `vercel.json` registers a daily cron hitting `/api/send`.

## Email delivery (plug in later)

The app is built to queue everything now and deliver once a provider is
configured — no code changes required for Resend:

1. Set `EMAIL_FROM="Your List <list@yourdomain.com>"`.
2. Set `RESEND_API_KEY=...` (verify your sending domain in Resend first).
3. New sends deliver immediately; already-queued messages drain on the next cron
   run or when you hit **Retry sending** on the message page.

To use a different provider, add a branch in `src/lib/email.ts` (`sendViaResend`
is the template) and set `EMAIL_PROVIDER` accordingly.

Until a provider is set, `isEmailConfigured()` is `false`: subscribe requests and
messages are still recorded, and an admin can confirm subscribers manually from
the list page. The confirmation/opt-in emails themselves also require a provider.

### Cron frequency

`vercel.json` uses a **daily** schedule so it deploys on any Vercel plan
(Hobby limits cron frequency). On Pro you can make it more frequent, e.g.:

```json
{ "crons": [{ "path": "/api/send", "schedule": "*/10 * * * *" }] }
```

Immediate sends don't wait for the cron — the dashboard **Send** button delivers
inline. The cron is a safety net for retries and for draining the queue after you
add an email provider.

## Scripts

```bash
npm run dev        # local dev
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

## Notes / roadmap

- Types in `src/lib/database.types.ts` are hand-written domain types. Once the
  Supabase connector has access to this project, regenerate authoritative types
  (`supabase gen types typescript`) and re-add the `<Database>` generic to the
  Supabase client factories for end-to-end query type-safety.
- Inbound email (members emailing a discussion list address) needs a provider
  inbound webhook (e.g. Resend/SendPost inbound) that posts to a route which
  creates a `messages` row with `kind = 'post'` and calls `enqueue_message`. The
  schema and fan-out already support this; the inbound webhook is not yet wired.
