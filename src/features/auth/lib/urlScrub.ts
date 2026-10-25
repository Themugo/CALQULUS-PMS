/**
 * Remove credential-bearing query parameters (invitation / activation tokens)
 * from the address bar once they have been read into component state, so they
 * do not linger in browser history, screenshots or Referer headers.
 * Uses the History API directly: the router's own location state is untouched.
 */
export function scrubUrlParams(...names: string[]): void {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    for (const name of names) {
      if (url.searchParams.has(name)) {
        url.searchParams.delete(name);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    // URL scrubbing is best-effort hardening; never block the flow.
  }
}
