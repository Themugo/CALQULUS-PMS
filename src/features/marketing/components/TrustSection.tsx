import { ShieldCheck } from "lucide-react";
import { TRUST_POINTS } from "@/features/marketing/publicConfig";

/**
 * Deep-navy trust statement — deliberately not another light feature grid.
 * Left: the trust position. Right: the four verified pillars, navy-on-navy.
 */
export function TrustSection() {
  return (
    <section className="border-b border-navy-deep bg-navy-deep py-14 text-white sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-14">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--calqulus-primary-light)]">
              Trust
            </p>
            <h2 className="public-section-title mt-2 text-white">
              Built for controlled property operations.
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/70 sm:text-base">
              CALQULUS manages sensitive property and financial information — access and
              accountability are part of the product, not an afterthought.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {TRUST_POINTS.map((point) => (
              <article
                key={point.title}
                className="rounded-[14px] border border-white/10 bg-white/[0.04] p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/20 text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="mt-3 font-heading text-base font-semibold text-white">
                  {point.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/65">{point.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
