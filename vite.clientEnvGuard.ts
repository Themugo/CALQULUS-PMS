/**
 * Production build guard.
 *
 * Vite inlines every VITE_* variable that is set at build time into the public
 * JavaScript bundle (src reads `import.meta.env` as a whole object). Variables
 * that carry credentials or enable dev/demo shortcuts therefore must never be
 * present when building for production, even though the runtime code ignores
 * them when PROD is true.
 */
export const FORBIDDEN_PRODUCTION_CLIENT_ENV: RegExp[] = [
  /^VITE_DEV_.*(PASSWORD|EMAIL)$/,
  /^VITE_DEV_ACCESS_/,
  /^VITE_DEMO_SEED_SECRET$/,
  /^VITE_WEBHOOK_SECRET$/,
];

export function findForbiddenClientEnv(env: Record<string, string | undefined>): string[] {
  return Object.keys(env)
    .filter((key) => key.startsWith("VITE_"))
    .filter((key) => (env[key] ?? "").trim() !== "")
    .filter((key) => FORBIDDEN_PRODUCTION_CLIENT_ENV.some((re) => re.test(key)))
    .sort();
}

export function assertNoForbiddenClientEnv(env: Record<string, string | undefined>): void {
  const found = findForbiddenClientEnv(env);
  if (found.length > 0) {
    throw new Error(
      `Refusing to build for production: these variables would be embedded in the public bundle: ${found.join(", ")}. ` +
        "Remove them from the build environment (dev-only values belong in a local .env.local).",
    );
  }
}
