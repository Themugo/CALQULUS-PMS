import { Link } from "react-router-dom";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { usePublicSiteConfig } from "@/features/marketing/hooks/usePublicSiteConfig";
import { DEFAULT_PUBLIC_SITE_CONFIG } from "@/features/marketing/publicSiteConfig";

function FooterLink({ href, label }: { href: string; label: string }) {
  if (href.startsWith("#")) return <a href={href} className="transition hover:text-white hover:underline hover:underline-offset-2">{label}</a>;
  if (/^https?:\/\//i.test(href)) return <a href={href} target="_blank" rel="noreferrer" className="transition hover:text-white hover:underline hover:underline-offset-2">{label}</a>;
  return <Link to={href} className="transition hover:text-white hover:underline hover:underline-offset-2">{label}</Link>;
}

export function PublicFooter() {
  const year = new Date().getFullYear();
  const { data } = usePublicSiteConfig();
  const config = data ?? DEFAULT_PUBLIC_SITE_CONFIG;
  return (
    <footer className="border-t border-[#0B2B7A] bg-[#0D2E7A] text-white">
      <div className="mx-auto max-w-[1480px] px-3 py-7 sm:px-4 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_2fr_1.25fr] lg:items-start">
          <div><BrandMark size="sm" showWordmark subtitleOverride={config.brand.descriptor} wordmarkOverride={config.brand.name} logoUrl={config.brand.logoUrl} inverse fetchPriority="low" forcePlatform/><p className="mt-3 max-w-xs text-[12px] leading-5 text-white/72">{config.shell.footer.tagline}</p></div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {config.shell.footer.columns.map((column) => <div key={column.id}><p className="text-[11px] font-bold tracking-[0.2em] text-white/90">{column.title}</p><div className="mt-2.5 flex flex-col gap-1.5 text-[11px] text-white/78">{column.items.map((item) => <FooterLink key={item.id} href={item.href} label={item.label}/>)}</div></div>)}
          </div>
          {config.shell.footer.showNewsletter ? <div><p className="text-[11px] font-bold tracking-[0.2em] text-white/90">{config.shell.footer.newsletterTitle}</p><div className="mt-2 flex overflow-hidden rounded-lg border border-white/10 bg-white"><input aria-label={config.shell.footer.newsletterTitle} placeholder={config.shell.footer.newsletterPlaceholder} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[10px] text-navy-deep outline-none placeholder:text-slate-400"/><button type="button" className="bg-success px-3 text-[11px] font-bold text-white">→</button></div><div className="mt-3 flex gap-1.5">{config.shell.footer.socials.filter((social) => social.enabled).map((social) => <FooterLink key={social.id} href={social.href} label={social.label}/>)}</div></div> : null}
        </div>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex max-w-[1480px] flex-col gap-1.5 px-3 py-3 text-[10px] text-white/65 sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:px-6"><span>{config.shell.footer.copyright.replace("{year}", String(year))}</span><span>{config.shell.footer.endTagline}</span></div></div>
    </footer>
  );
}
