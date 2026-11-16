import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

type Reach = "checking" | "ok" | "down" | "unconfigured";

/**
 * Pre-flight check shown on sign-in screens. If the auth service cannot be
 * reached (offline, paused project, blocked request) the person is told BEFORE
 * they type a password, instead of getting a vague "network error" afterwards.
 * Renders nothing when the service answers or when env is not configured.
 */
export function BackendStatusNotice() {
  const [state, setState] = useState<Reach>("checking");

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (!url || !key || url.includes("placeholder")) {
      // Local/preview builds run on the simulated client on purpose; a production build must not.
      setState(import.meta.env.PROD ? "unconfigured" : "ok");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      headers: { apikey: key },
      signal: controller.signal,
    })
      .then((res) => setState(res.status >= 500 ? "down" : "ok"))
      .catch(() => setState(navigator.onLine === false ? "down" : "down"))
      .finally(() => window.clearTimeout(timer));
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  if (state === "unconfigured") {
    return (
      <div role="alert" className="mb-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>This site is not connected to its service yet, so sign-in is unavailable. Please contact support.</span>
      </div>
    );
  }
  if (state !== "down") return null;
  return (
    <div role="alert" className="mb-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        {navigator.onLine === false
          ? "You appear to be offline. Reconnect to sign in."
          : "We can't reach the CALQULUS service right now, so sign-in will fail. Please try again shortly, or contact support if this continues."}
      </span>
    </div>
  );
}
