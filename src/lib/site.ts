/**
 * Resolve the public base URL for building confirm/unsubscribe links.
 * Prefers NEXT_PUBLIC_SITE_URL, falls back to the Vercel-provided URL.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
