import { Link } from "react-router-dom";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-navy-deep text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-4"><BrandMark size="sm" showWordmark subtitle="" inverse fetchPriority="low" forcePlatform /><span className="hidden text-xs text-white/50 sm:inline">Property operations, connected.</span></div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/65">
          <a href="/#platform" className="hover:text-white">Platform</a>
          <Link to={PUBLIC_ROUTES.pricing} className="hover:text-white">Pricing</Link>
          <Link to={PUBLIC_ROUTES.legalPrivacy} className="hover:text-white">Privacy</Link>
          <Link to={PUBLIC_ROUTES.legalTerms} className="hover:text-white">Terms</Link>
          <Link to={PUBLIC_ROUTES.managerSignIn} className="hover:text-white">Sign in</Link>
        </nav>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto max-w-6xl px-4 py-3 text-[11px] text-white/45 sm:px-6 lg:px-8">© {year} CALQULUS Limited. All rights reserved.</div></div>
    </footer>
  );
}
