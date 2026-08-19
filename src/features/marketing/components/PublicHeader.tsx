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
import { PUBLIC_NAV, PUBLIC_ROUTES, homeSectionHref } from "@/features/marketing/publicConfig";

export function PublicHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const onPricing = pathname === PUBLIC_ROUTES.pricing;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to={PUBLIC_ROUTES.home}
          className="flex min-w-0 items-center rounded-md focus-visible:outline-none"
          aria-label="CALQULUS home"
        >
          <BrandMark size="nav" showWordmark subtitle="" fetchPriority="high" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV.map((item) => (
            <a
              key={item.hash}
              href={homeSectionHref(item.hash, pathname)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
          <Link
            to={PUBLIC_ROUTES.pricing}
            aria-current={onPricing ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
              onPricing ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden min-h-11 sm:inline-flex">
            <Link to={PUBLIC_ROUTES.managerSignIn}>Sign in</Link>
          </Button>
          <Button asChild size="sm" className="min-h-11 btn-brand">
            <Link to={PUBLIC_ROUTES.managerSignUp}>Get started</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-11 min-w-11 lg:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <SheetContent side="right" className="w-[min(100%,20rem)] bg-card">
              <SheetHeader>
                <SheetTitle className="text-left font-heading">CALQULUS</SheetTitle>
                <SheetDescription className="text-left">
                  Property operations platform
                </SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">
                {PUBLIC_NAV.map((item) => (
                  <a
                    key={item.hash}
                    href={homeSectionHref(item.hash, pathname)}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {item.label}
                  </a>
                ))}
                <Link
                  to={PUBLIC_ROUTES.pricing}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Pricing
                </Link>
                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                  <Button asChild variant="outline" className="min-h-11 w-full">
                    <Link to={PUBLIC_ROUTES.managerSignIn} onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                  <Button asChild className="btn-brand min-h-11 w-full">
                    <Link to={PUBLIC_ROUTES.managerSignUp} onClick={() => setOpen(false)}>
                      Get started
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
