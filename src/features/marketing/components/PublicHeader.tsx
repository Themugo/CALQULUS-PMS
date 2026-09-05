import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/components/ui/sheet";
import { usePublicSiteConfig } from "@/features/marketing/hooks/usePublicSiteConfig";
import { DEFAULT_PUBLIC_SITE_CONFIG } from "@/features/marketing/publicSiteConfig";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

const navClass = "inline-flex min-h-9 items-center rounded-md px-2.5 py-1.5 text-[12px] font-semibold tracking-[0.01em] text-white/95 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
const LEGACY_HASH_TARGETS: Record<string, string> = { solutions: "#why", resources: "#insights", about: "#trust", contact: "#cta" };

function resolveNavHref(id: string, href: string) {
  if (LEGACY_HASH_TARGETS[id]) return LEGACY_HASH_TARGETS[id];
  return href;
}

function HeaderLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  if (href.startsWith("#")) return <a href={href} onClick={onClick} className={navClass}>{label}</a>;
  if (/^https?:\/\//i.test(href)) return <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={navClass}>{label}</a>;
  return <Link to={href} onClick={onClick} className={navClass}>{label}</Link>;
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { data } = usePublicSiteConfig();
  const config = data ?? DEFAULT_PUBLIC_SITE_CONFIG;
  const navItems = config.shell.header.nav
    .filter((item) => item.enabled && item.label.trim())
    .map((item) => ({ ...item, href: resolveNavHref(item.id, item.href) }))
    .filter((item) => item.href);
  return (
    <header className="sticky top-0 z-40 border-b border-[#0A2A72]/80 bg-[#0B1F78] text-white shadow-[0_8px_24px_rgba(11,31,120,0.22)]">
      <div className="mx-auto flex h-[60px] max-w-[1480px] items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
        <Link to={PUBLIC_ROUTES.home} className="flex min-w-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" aria-label="CALQULUS home">
          <BrandMark size="nav" showWordmark subtitle="" fetchPriority="high" forcePlatform inverse />
        </Link>
        <nav aria-label="Primary" className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
          {navItems.map((item) => <HeaderLink key={item.id} href={item.href} label={item.label} />)}
        </nav>
        <div className="flex items-center gap-1.5">
          <a href="#quick-search" className="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/8 text-white transition hover:bg-white/15 sm:flex" aria-label={config.shell.header.searchLabel}><Search className="h-4 w-4"/></a>
          <Button asChild size="sm" className="min-h-9 rounded-lg bg-white px-4 text-[12px] font-bold text-[#0B1F78] shadow-sm hover:bg-white/90"><Link to={PUBLIC_ROUTES.managerSignIn}>{config.shell.header.signInLabel}</Link></Button>
          <div className="hidden h-8 w-[58px] flex-col justify-center text-[8px] font-bold leading-3 tracking-[0.22em] text-white/85 xl:flex">{config.shell.header.utilityWords.filter(Boolean).slice(0,3).map((word) => <span key={word}>{word}</span>)}</div>
          <Sheet open={open} onOpenChange={setOpen}>
            <Button type="button" variant="outline" size="icon" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-4 w-4"/></Button>
            <SheetContent side="right" className="w-[min(100%,20rem)] border-[#0A2A72] bg-[#0B1F78] text-white">
              <SheetHeader><SheetTitle className="text-left font-heading text-white">CALQULUS</SheetTitle><SheetDescription className="text-left text-white/75">Property operations platform</SheetDescription></SheetHeader>
              <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">{navItems.map((item) => <HeaderLink key={item.id} href={item.href} label={item.label} onClick={() => setOpen(false)}/>)}<div className="mt-4 border-t border-white/15 pt-4"><HeaderLink href="#quick-search" label={config.shell.header.searchLabel} onClick={() => setOpen(false)}/><Button asChild className="mt-2 min-h-10 w-full bg-white text-[#0B1F78] hover:bg-white/90"><Link to={PUBLIC_ROUTES.managerSignIn} onClick={() => setOpen(false)}>{config.shell.header.signInLabel}</Link></Button></div></nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
