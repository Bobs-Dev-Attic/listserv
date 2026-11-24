"use client";

import { createBrowserClient } from "@supabase/ssr";

// NOTE: Untyped for now. Once the Supabase connector is reconnected we generate
// types (supabase gen types / MCP) into database.types.ts and add the
// `<Database>` generic back here for full type-safety on queries.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
