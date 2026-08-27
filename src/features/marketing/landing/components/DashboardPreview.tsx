import { Bell, Search } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { landingIcon } from "@/features/marketing/landing/landingIcon";
import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import type { DashboardPreviewContent } from "@/features/marketing/landing/landingContent";

const SIDEBAR_ICONS = ["LayoutDashboard", "Building2", "Users", "Receipt", "Wrench", "BarChart3"];

interface DashboardPreviewProps {
  config: DashboardPreviewContent;
}

/**
 * Static, config-driven illustration of the CALQULUS manager dashboard.
 * Shows properties, units, occupancy, collected, outstanding, a collections
 * trend and a needs-attention panel. All figures are labelled illustrative.
 */
export function DashboardPreview({ config }: DashboardPreviewProps) {
  const latest = config.trend.length > 0 ? config.trend[config.trend.length - 1] : 0;

  return (
    <figure className="w-full" aria-label={config.disclaimer}>
      <div className="flex overflow-hidden rounded-[14px] border border-landing-border bg-landing-surface shadow-xl shadow-landing-primary/10">
        <nav
          aria-hidden
          className="hidden w-11 shrink-0 flex-col items-center gap-3 border-r border-landing-border bg-landing-primary py-3 sm:flex"
        >
          <BrandMark size="xs" forcePlatform />
          <ul className="mt-1 flex flex-col gap-2">
            {SIDEBAR_ICONS.map((name, i) => {
              const Icon = landingIcon(name);
              return (
                <li key={name}>
                  <span
                    className={
                      i === 0
                        ? "flex h-7 w-7 items-center justify-center rounded-md bg-white/15 text-white"
                        : "flex h-7 w-7 items-center justify-center rounded-md text-white/70"
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 bg-landing-surface">
          {/* header */}
          <div className="flex items-center justify-between gap-3 border-b border-landing-border bg-landing-surface px-3 py-2 sm:px-4">
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold tracking-tight text-landing-textprimary">
                {config.title}
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-landing-textsecondary">
                {config.caption}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-landing-textsecondary" aria-hidden>
              <Search className="h-3.5 w-3.5" />
              <Bell className="h-3.5 w-3.5" />
              <span className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-landing-primary text-[9px] font-semibold text-white">
                JM
              </span>
            </div>
          </div>

          <div className="bg-landing-background p-3 sm:p-4">
            {/* metric cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {config.snapshot.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-landing-border bg-landing-surface p-2">
                  <p className="truncate text-[9px] font-medium uppercase tracking-wide text-landing-textsecondary">
                    {metric.label}
                  </p>
                  <p className="mt-1 truncate font-heading text-sm font-bold leading-none tracking-tight text-landing-primary">
                    {metric.value}
                  </p>
                  <p className="mt-1 truncate text-[9px] text-landing-textsecondary">{metric.sub}</p>
                </div>
              ))}
            </div>

            {/* collections trend */}
            <div className="mt-3 rounded-lg border border-landing-border bg-landing-surface p-3 pb-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="type-label text-landing-textprimary">{config.chartTitle}</p>
                <span className="font-heading text-[11px] font-bold text-landing-accent">
                  {latest}%
                </span>
              </div>
              <div
                className="relative flex items-end gap-[6px] pt-5"
                role="img"
                aria-label={`${config.chartSeriesLabel} — illustrative values`}
              >
                <div className="pointer-events-none absolute inset-x-0 top-5 bottom-4 flex flex-col justify-between" aria-hidden>
                  <span className="border-t border-landing-border/60" />
                  <span className="border-t border-landing-border/60" />
                  <span className="border-t border-landing-border/60" />
                </div>
                {config.trend.map((height, index) => {
                  const isLatest = index === config.trend.length - 1;
                  return (
                    <div key={index} className="relative z-[1] flex-1">
                      <div className="flex h-12 items-end">
                        <div
                          className={`w-full rounded-t-[3px] transition-colors duration-200 ${
                            isLatest ? "bg-landing-primary" : "bg-landing-primary/35 hover:bg-landing-primary/55"
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <p className="mt-1 border-t border-landing-border pb-0 pt-1 text-center text-[7px] font-medium tracking-wide text-landing-textsecondary" aria-hidden>
                        {config.weekTicks[index]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* portfolio performance + attention */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="type-label mb-2 text-landing-textprimary">{config.portfolioTitle}</p>
                <div className="group overflow-hidden rounded-lg border border-landing-border bg-landing-surface">
                  <img
                    src={PROPERTY_IMAGES.residential}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
                  />
                  <div className="flex items-center justify-between gap-2 p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-landing-textprimary">
                        {config.portfolioLeft.label}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-landing-textsecondary">
                        {config.portfolioRight.value}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-heading text-[11px] font-bold text-landing-primary">
                        {config.portfolioRight.label}
                      </p>
                      <p className="text-[9px] text-landing-textsecondary">Sample</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="type-label mb-2 text-landing-textprimary">{config.attentionTitle}</p>
                <ul className="divide-y divide-landing-border overflow-hidden rounded-lg border border-landing-border bg-landing-surface">
                  {config.attention.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs"
                    >
                      <span className="min-w-0 truncate text-landing-textsecondary">{item.label}</span>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                          item.tone === "attention"
                            ? "bg-landing-warning/15 text-landing-warning"
                            : "bg-landing-success/12 text-landing-success"
                        }`}
                      >
                        {item.tone === "attention" ? "Attention" : "Clear"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-2.5 text-center text-xs text-landing-textsecondary">
        {config.disclaimer}
      </figcaption>
    </figure>
  );
}