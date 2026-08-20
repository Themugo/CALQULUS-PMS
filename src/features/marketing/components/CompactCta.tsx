import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { CONTACT_EMAIL, PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

export function CompactCta() {
  return (
    <section id="contact" className="scroll-mt-20 border-t border-border bg-background py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[14px] border border-border bg-navy-primary px-6 py-8 text-white sm:px-10 sm:py-9">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
                Bring your property operations together.
              </h2>
              <p className="mt-1.5 text-sm text-white/72">
                One platform for managers, landlords, agencies and tenants.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" className="btn-brand min-h-11">
                <Link to={PUBLIC_ROUTES.managerSignUp}>Get started</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-11 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a href={`mailto:${CONTACT_EMAIL}`}>Contact us</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
