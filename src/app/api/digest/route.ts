import { NextResponse, type NextRequest } from "next/server";
import { processDigests } from "@/lib/digest-worker";

// Sends per-list digests to 'digest' subscribers. Called by the Vercel cron
// (see vercel.json). Secured by CRON_SECRET when set (Vercel sends it as
// `Authorization: Bearer <CRON_SECRET>`).

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await processDigests();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
