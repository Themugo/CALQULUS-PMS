import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/utils";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import type { LandingHeader } from "@/features/marketing/landing/landingContent";

interface PremiumHeaderProps {
  config: LandingHeader;
}

const navLinkBase =
  "inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2";
const navLinkLight = `${navLinkBase} text-landing-textsecondary hover:bg-landing-primarylight hover:text-landing-textprimary focus-visible:ring-landing-accent`;

/** Resolve a header nav item to a real destination (pricing is a route). */
function navHref(hash: string, pathname: string): string {
  if (hash === "pricing") return PUBLIC_ROUTES.pricing;
  return pathname === "/" ? `#${hash}` : `/#${hash}`;
}

/**
 * Premium sticky header — white, subtle border, compact. Nav + actions are
 * fully data-driven from the landing config.
 */
export function PremiumHeader({ config }: PremiumHeaderProps) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const onPricing = pathname === PUBLIC_ROUTES.pricing;

  return (
    <header className="sticky top-0 z-40 border-b border-landing-border bg-landing-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to={PUBLIC_ROUTES.home}
          className="flex min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-accent"
          aria-label="CALQULUS home"
        >
          <BrandMark size="nav" showWordmark subtitle="" fetchPriority="high" forcePlatform />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          {config.nav.map((item) => (
            <Link
              key={item.hash}
              to={navHref(item.hash, pathname)}
              aria-current={item.hash === "pricing" && onPricing ? "page" : undefined}
              className={cn(
                navLinkLight,
                item.hash === "pricing" && onPricing && "text-landing-primary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden min-h-11 text-[14px] text-landing-textsecondary hover:bg-landing-primarylight hover:text-landing-textprimary sm:inline-flex"
          >
            <Link to={config.signIn.href}>{config.signIn.label}</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="min-h-11 bg-landing-primary text-white hover:bg-landing-primarydark text-[14px]"
          >
            <Link to={config.primaryCta.href}>{config.primaryCta.label}</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <SheetContent side="right" className="w-[min(100%,20rem)] bg-landing-surface text-landing-textprimary">
              <SheetHeader>
                <SheetTitle className="text-left font-heading text-landing-textprimary">
                  {config.nav[0]?.label ? "CALQULUS" : "CALQULUS"}
                </SheetTitle>
                <SheetDescription className="text-left text-landing-textsecondary">
                  Property operations platform
                </SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">
                {config.nav.map((item) => (
                  <Link
                    key={item.hash}
                    to={navHref(item.hash, pathname)}
                    onClick={() => setOpen(false)}
                    className="min-h-11 rounded-md px-3 py-3 text-sm font-medium text-landing-textprimary hover:bg-landing-primarylight"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-4 flex flex-col gap-2 border-t border-landing-border pt-4">
                  <Button asChild variant="outline" className="min-h-11 w-full">
                    <Link to={config.signIn.href} onClick={() => setOpen(false)}>
                      {config.signIn.label}
                    </Link>
                  </Button>
                  <Button asChild className="min-h-11 w-full bg-landing-primary text-white hover:bg-landing-primarydark">
                    <Link to={config.primaryCta.href} onClick={() => setOpen(false)}>
                      {config.primaryCta.label}
                    </Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}