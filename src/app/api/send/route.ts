import { NextResponse, type NextRequest } from "next/server";
import { processQueue } from "@/lib/send-worker";

// This endpoint drains the delivery queue. It's called by the Vercel cron
// (see vercel.json) as a safety net / retry mechanism; the dashboard "Send"
// button delivers inline for immediate sends.
//
// Security: if CRON_SECRET is set, require it. Vercel cron automatically sends
// `Authorization: Bearer <CRON_SECRET>` when that env var is configured.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured (e.g. local dev)
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summaries = await processQueue();
    return NextResponse.json({ ok: true, summaries });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
