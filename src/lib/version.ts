import pkg from "../../package.json";

/** App version from package.json, e.g. "0.1.0". */
export const APP_VERSION: string = pkg.version;

/**
 * Short commit SHA of the running deployment, when available. Vercel exposes
 * VERCEL_GIT_COMMIT_SHA at build time; empty locally.
 */
export const APP_COMMIT: string = (
  process.env.VERCEL_GIT_COMMIT_SHA ?? ""
).slice(0, 7);

/** A compact version label, e.g. "v0.1.0 · a1b2c3d" (SHA omitted if unknown). */
export const VERSION_LABEL: string = APP_COMMIT
  ? `v${APP_VERSION} · ${APP_COMMIT}`
  : `v${APP_VERSION}`;
