import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/utils";
import { PUBLIC_NAV, PUBLIC_ROUTES, homeSectionHref } from "@/features/marketing/publicConfig";
import { usePublicSiteConfig } from "@/features/marketing/hooks/usePublicSiteConfig";
import { DEFAULT_PUBLIC_SITE_CONFIG } from "@/features/marketing/publicSiteConfig";

const navLink = "inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-[14px] font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success";

export function PublicHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { data } = usePublicSiteConfig();
  const config = data ?? DEFAULT_PUBLIC_SITE_CONFIG;
  const onPricing = pathname === PUBLIC_ROUTES.pricing;
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-deep/95 text-white backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to={PUBLIC_ROUTES.home} className="flex min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success" aria-label="CALQULUS home">
          <BrandMark size="nav" showWordmark subtitle="" fetchPriority="high" forcePlatform inverse />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          {PUBLIC_NAV.map((item) => <a key={item.hash} href={homeSectionHref(item.hash, pathname)} className={navLink}>{item.label}</a>)}
          <Link to={PUBLIC_ROUTES.pricing} aria-current={onPricing ? "page" : undefined} className={cn(navLink, onPricing && "text-success")}>{config.shell.header.pricingLabel}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden min-h-11 text-[14px] text-white hover:bg-white/8 hover:text-white sm:inline-flex"><Link to={PUBLIC_ROUTES.managerSignIn}>{config.shell.header.signInLabel}</Link></Button>
          <Button asChild size="sm" className="min-h-11 border border-success/20 bg-success text-navy-deep hover:bg-success/90"><Link to={PUBLIC_ROUTES.managerSignUp}>{config.shell.header.getStartedLabel}</Link></Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <Button type="button" variant="outline" size="icon" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-4 w-4" /></Button>
            <SheetContent side="right" className="w-[min(100%,20rem)] border-white/10 bg-navy-deep text-white">
              <SheetHeader><SheetTitle className="text-left font-heading text-white">CALQULUS</SheetTitle><SheetDescription className="text-left text-white/55">Property operations platform</SheetDescription></SheetHeader>
              <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">
                {PUBLIC_NAV.map((item) => <a key={item.hash} href={homeSectionHref(item.hash, pathname)} onClick={() => setOpen(false)} className="min-h-11 rounded-md px-3 py-3 text-sm font-medium text-white/80 hover:bg-white/8">{item.label}</a>)}
                <Link to={PUBLIC_ROUTES.pricing} onClick={() => setOpen(false)} className="min-h-11 rounded-md px-3 py-3 text-sm font-medium text-white/80 hover:bg-white/8">{config.shell.header.pricingLabel}</Link>
                <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4"><Button asChild variant="outline" className="min-h-11 w-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link to={PUBLIC_ROUTES.managerSignIn} onClick={() => setOpen(false)}>{config.shell.header.signInLabel}</Link></Button><Button asChild className="min-h-11 w-full bg-success text-navy-deep hover:bg-success/90"><Link to={PUBLIC_ROUTES.managerSignUp} onClick={() => setOpen(false)}>{config.shell.header.getStartedLabel}</Link></Button></div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
