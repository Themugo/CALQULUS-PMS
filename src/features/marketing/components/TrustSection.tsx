import { FileCheck, History, Lock, ShieldCheck, type LucideIcon } from "lucide-react";
import { TRUST_POINTS } from "@/features/marketing/publicConfig";

const TRUST_ICONS: Record<(typeof TRUST_POINTS)[number]["title"], LucideIcon> = {
  "Role-based": Lock,
  Secure: ShieldCheck,
  Auditable: History,
  Reliable: FileCheck,
};

/** Compact trust grid — four verified pillars, icons and short copy only. */
export function TrustSection() {
  return (
    <section className="border-b border-border bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="public-section-title">Built to keep operations moving.</h2>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map((point) => {
            const Icon = TRUST_ICONS[point.title];
            return (
              <article
                key={point.title}
                className="rounded-[14px] border border-border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="mt-3 font-heading text-base font-semibold text-foreground">
                  {point.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{point.copy}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
