import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Menu } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/utils";
import {
  PUBLIC_NAV,
  PUBLIC_ROUTES,
  RESOURCE_LINKS,
  homeSectionHref,
} from "@/features/marketing/publicConfig";

const navLinkBase =
  "inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2";
const navLinkLight = `${navLinkBase} text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring`;
const navLinkDark = `${navLinkBase} text-white/78 hover:bg-white/10 hover:text-white focus-visible:ring-white/70`;

export function PublicHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const onPricing = pathname === PUBLIC_ROUTES.pricing;
  const overHero = pathname === PUBLIC_ROUTES.home && !scrolled;
  const navLinkClass = overHero ? navLinkDark : navLinkLight;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200",
        overHero ? "border-transparent bg-transparent" : "border-border bg-card/95 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to={PUBLIC_ROUTES.home}
          className={cn(
            "flex min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2",
            overHero ? "focus-visible:ring-white/70" : "focus-visible:ring-ring",
          )}
          aria-label="CALQULUS home"
        >
          <BrandMark size="nav" showWordmark subtitle="" fetchPriority="high" forcePlatform inverse={overHero} />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          {PUBLIC_NAV.map((item) => (
            <a key={item.hash} href={homeSectionHref(item.hash, pathname)} className={navLinkClass}>
              {item.label}
            </a>
          ))}
          <Link
            to={PUBLIC_ROUTES.pricing}
            aria-current={onPricing ? "page" : undefined}
            className={cn(navLinkClass, onPricing && (overHero ? "text-white" : "text-primary"))}
          >
            Pricing
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className={navLinkClass} aria-label="Resources">
              Resources
              <ChevronDown className="ml-1 h-3.5 w-3.5" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {RESOURCE_LINKS.map((item) =>
                "href" in item ? (
                  <DropdownMenuItem key={item.label} asChild>
                    <a href={item.href}>{item.label}</a>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem key={item.label} asChild>
                    <a href={homeSectionHref(item.hash, pathname)}>{item.label}</a>
                  </DropdownMenuItem>
                ),
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              "hidden min-h-11 text-[14px] sm:inline-flex",
              overHero && "text-white/85 hover:bg-white/10 hover:text-white",
            )}
          >
            <Link to={PUBLIC_ROUTES.managerSignIn}>Sign in</Link>
          </Button>
          <Button asChild size="sm" className="min-h-11 btn-brand text-[14px]">
            <Link to={PUBLIC_ROUTES.managerSignUp}>Get started</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                "lg:hidden",
                overHero && "border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white",
              )}
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <SheetContent side="right" className="w-[min(100%,20rem)] bg-card text-foreground">
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
                    className="min-h-11 rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {item.label}
                  </a>
                ))}
                <Link
                  to={PUBLIC_ROUTES.pricing}
                  onClick={() => setOpen(false)}
                  className="min-h-11 rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Pricing
                </Link>
                {RESOURCE_LINKS.map((item) =>
                  "href" in item ? (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="min-h-11 rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <a
                      key={item.label}
                      href={homeSectionHref(item.hash, pathname)}
                      onClick={() => setOpen(false)}
                      className="min-h-11 rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      {item.label}
                    </a>
                  ),
                )}
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
