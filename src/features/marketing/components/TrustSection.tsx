import { ShieldCheck } from "lucide-react";
import { TRUST_POINTS } from "@/features/marketing/publicConfig";

export function TrustSection() {
  return (
    <section className="border-b border-border bg-card py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="public-section-title">Built for controlled property operations.</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            CALQULUS manages sensitive property and financial information — access and
            accountability are part of the product, not an afterthought.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map((point) => (
            <article
              key={point.title}
              className="rounded-[14px] border border-border bg-background p-5 shadow-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="mt-3 font-heading text-base font-semibold text-foreground">
                {point.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{point.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
