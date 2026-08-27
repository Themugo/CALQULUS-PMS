import { landingIcon } from "@/features/marketing/landing/landingIcon";
import type { LandingMetric } from "@/features/marketing/landing/landingContent";

interface PlatformMetricsProps {
  id?: string;
  eyebrow?: string;
  title: string;
  sub?: string;
  items: LandingMetric[];
}

/**
 * Platform proof — compact metrics strip. Every "metric" is data-driven; the
 * `illustrative` flag prints a small "sample" asterisk so nothing reads as a
 * fabricated customer stat.
 */
export function PlatformMetrics({ id = "metrics", eyebrow = "Platform proof", title, sub, items }: PlatformMetricsProps) {
  return (
    <section id={id} className="scroll-mt-24 bg-landing-surface py-12 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          {eyebrow ? <p className="landing-eyebrow">{eyebrow}</p> : null}
          <h2 className="landing-section-title mt-2">{title}</h2>
          {sub ? (
            <p className="mt-2 text-[15px] leading-relaxed text-landing-textsecondary sm:text-base">{sub}</p>
          ) : null}
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((metric) => {
            const Icon = landingIcon(metric.icon);
            return (
              <div key={metric.label} className="landing-card p-5 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-[10px] bg-landing-primarylight text-landing-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <dt className="mt-3 order-2 font-heading text-sm font-medium text-landing-textsecondary">
                  {metric.label}
                  {metric.illustrative ? <span aria-label="sample value"> · sample</span> : null}
                </dt>
                <dd className="order-1 font-heading text-2xl font-bold tracking-tight text-landing-primary">
                  {metric.value}
                </dd>
              </div>
            );
          })}
        </dl>
        <p className="mt-4 text-center text-[11px] text-landing-textsecondary/80">
          Values marked · sample are illustrative capability indicators, not audited customer statistics.
        </p>
      </div>
    </section>
  );
}