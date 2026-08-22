import { WORKFLOW_STEPS } from "@/features/marketing/publicConfig";

export function OperationalWorkflow() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-border bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="public-section-title">Everything connected.</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            CALQULUS connects the full operational lifecycle — so your team stops managing
            disconnected tools and starts running one system.
          </p>
        </div>

        <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_STEPS.map((step, index) => (
            <li
              key={step.label}
              className="relative rounded-[12px] border border-border bg-background p-4 shadow-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-primary text-[11px] font-semibold text-white">
                {index + 1}
              </span>
              <h3 className="mt-3 font-heading text-sm font-semibold text-foreground sm:text-[15px]">
                {step.label}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{step.note}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
