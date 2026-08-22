import { Check } from "lucide-react";
import { PLATFORM_SUMMARY } from "@/features/marketing/publicConfig";

const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.16em] text-primary";

export function PlatformOverview() {
  return (
    <section id="platform" className="scroll-mt-20 border-b border-border bg-card py-12 sm:py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.52fr)_minmax(0,0.48fr)] lg:gap-12 lg:px-8">
        <div>
          <p className={EYEBROW}>Platform</p>
          <h2 className="public-section-title mt-2">One focused operational system.</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Properties, units, tenants, leases, billing, payments, maintenance, documents and
            reporting — connected in a single workspace instead of scattered across spreadsheets
            and disconnected tools.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PLATFORM_SUMMARY.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 rounded-[12px] border border-border bg-card p-3.5 shadow-sm"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-3 w-3" aria-hidden />
              </span>
              <span className="text-sm leading-relaxed text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
