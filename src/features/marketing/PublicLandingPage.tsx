import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, BarChart3, Building2, ChevronLeft, ChevronRight, Clock3, Cloud, FileStack, Home, Landmark, Search, ShieldCheck, Sparkles, TrendingUp, Users, Wrench, Leaf, Settings2 } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { PublicPricing } from "@/features/marketing/components/PublicPricing";
import { MobileQuickAccess } from "@/features/marketing/components/MobileAppChrome";
import { PublicShell } from "@/features/marketing/components/PublicShell";
import { usePublicTiers } from "@/features/marketing/hooks/usePublicTiers";
import { usePublicSiteConfig } from "@/features/marketing/hooks/usePublicSiteConfig";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import { DEFAULT_PUBLIC_SITE_CONFIG, type PublicSiteConfig, type PublicSiteSectionId, type PublicSiteRailId, type PublicSiteMarketingAd } from "@/features/marketing/publicSiteConfig";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { CALQULUS_PORTAL_ACCENT } from "@/shared/theme/tokens";

const CONTAINER = "mx-auto w-full max-w-[1480px] px-3 sm:px-4 lg:px-6";
const PROPERTY_ICONS = { home: Home, building: Building2, office: Building2, landmark: Landmark } as const;
const PORTAL_ICONS = { agency: Building2, manager: Settings2, landlord: TrendingUp, tenant: Home } as const;
const PORTAL_COLORS = {
  agency: CALQULUS_PORTAL_ACCENT.agency.hex,
  manager: CALQULUS_PORTAL_ACCENT.manager.hex,
  landlord: CALQULUS_PORTAL_ACCENT.landlord.hex,
  tenant: CALQULUS_PORTAL_ACCENT.tenant.hex,
} as const;
const WHY_ICONS = { stack: FileStack, gear: Settings2, chart: BarChart3, leaf: Leaf } as const;
const HERO_PILL_ICONS = { portals: Users, secure: ShieldCheck, insights: TrendingUp, reliable: Cloud } as const;
const HIGHLIGHT_ICONS = { property: Building2, users: Users, uptime: Clock3, support: ShieldCheck } as const;

/** Config eyebrows are stored in capitals; show them as quiet sentence case. Short acronyms stay capitalised. */
const KEEP_CAPS = new Set(["KES", "KRA", "SMS", "PMS", "M-PESA", "CALQULUS", "AI"]);
function softCase(text: string | null | undefined): string {
  const value = (text ?? "").trim();
  if (!value || value !== value.toUpperCase() || !/[A-Z]{4,}/.test(value)) return value;
  return value.toLowerCase().split(" ").map((word, i) => {
    const bare = word.replace(/[^a-z-]/g, "").toUpperCase();
    if (KEEP_CAPS.has(bare)) return word.toUpperCase();
    return i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  }).join(" ");
}
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const EYEBROW = "font-heading text-[13px] font-semibold tracking-[0.02em] text-primary";
const CARD = "rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,42,67,0.05),0_8px_24px_rgba(16,42,67,0.06)]";
const CARD_LINK = `${CARD} transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-[0_1px_2px_rgba(16,42,67,0.06),0_14px_30px_rgba(16,42,67,0.10)] ${FOCUS_RING}`;

function img(url: string | null | undefined, fallback: string) { return typeof url === "string" && url.trim() ? url : fallback; }
function isWebExternal(href: string) { return /^https?:\/\//i.test(href); }
function isProtocolLink(href: string) { return /^(?:https?:\/\/|mailto:|tel:)/i.test(href); }
function NavLink({ href, children, onClick, className = "", tabIndex, ariaLabel }: { href: string; children: ReactNode; onClick?: () => void; className?: string; tabIndex?: number; ariaLabel?: string }) {
  if (href.startsWith("#")) return <a href={href} onClick={onClick} className={className} tabIndex={tabIndex} aria-label={ariaLabel}>{children}</a>;
  if (isProtocolLink(href)) return <a href={href} target={isWebExternal(href) ? "_blank" : undefined} rel={isWebExternal(href) ? "noreferrer" : undefined} onClick={onClick} className={className} tabIndex={tabIndex} aria-label={ariaLabel}>{children}</a>;
  return <Link to={href} onClick={onClick} className={className} tabIndex={tabIndex} aria-label={ariaLabel}>{children}</Link>;
}

function AdCard({ ad, className = "" }: { ad: PublicSiteMarketingAd; className?: string }) {
  const sizeClass = ad.size === "wide" ? "min-h-[150px]" : ad.size === "standard" ? "min-h-[118px]" : "min-h-[92px]";
  return (
    <NavLink
      href={ad.href}
      ariaLabel={ad.title}
      className={`group relative block overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_14px_34px_rgba(16,42,67,0.16)] backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${sizeClass} ${className}`}
    >
      {ad.image ? <img src={ad.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 transition duration-500 group-hover:scale-105" /> : null}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/92 to-white/55" />
      <div className="relative flex h-full items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold tracking-[0.15em] text-white">{ad.label}</span>
          <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-4.5 text-navy-deep">{ad.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-4.5 text-muted-foreground">{ad.copy}</p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </NavLink>
  );
}

function replacementAd(ads: PublicSiteMarketingAd[], targetId: string) {
  return ads.find((ad) => ad.enabled && ad.mode === "replace" && ad.targetId === targetId) ?? null;
}

function overlayAd(ads: PublicSiteMarketingAd[], placement: PublicSiteMarketingAd["placement"]) {
  return ads.find((ad) => ad.enabled && ad.mode === "overlay" && ad.placement === placement) ?? null;
}

function adPositionClass(position: PublicSiteMarketingAd["position"]) {
  switch (position) {
    case "top-left": return "left-3 top-3";
    case "bottom-left": return "bottom-3 left-3";
    case "bottom-right": return "bottom-3 right-3";
    default: return "right-3 top-3";
  }
}

function Hero({ config }: { config: PublicSiteConfig }) {
  const enabledSlides = config.hero.slides.filter((slide) => slide?.enabled);
  const slides = enabledSlides.length ? enabledSlides : DEFAULT_PUBLIC_SITE_CONFIG.hero.slides;
  const heroMarketingAd = overlayAd(config.marketingAds, "hero");
  const enabledPromos = config.hero.floatingCards.filter((card) => card?.enabled).slice(0, 3);
  const promos = heroMarketingAd ? [] : (enabledPromos.length ? enabledPromos : DEFAULT_PUBLIC_SITE_CONFIG.hero.floatingCards);
  const pills = config.hero.pills.filter((pill) => pill?.enabled);
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!config.hero.autoplay || slides.length < 2 || isPaused || prefersReducedMotion) return;
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % slides.length),
      config.hero.intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [config.hero.autoplay, config.hero.intervalMs, slides.length, isPaused, prefersReducedMotion]);

  useEffect(() => {
    setActive((value) => Math.min(value, Math.max(slides.length - 1, 0)));
  }, [slides.length]);

  const previous = () => setActive((value) => (value - 1 + slides.length) % slides.length);
  const next = () => setActive((value) => (value + 1) % slides.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="CALQULUS property highlights"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsPaused(false); }}
      className={`relative isolate overflow-hidden py-2 sm:py-3 ${
        config.hero.fitMode === "screen" ? "min-h-[calc(100svh-72px)]" : ""
      }`}
    >
      <div className={`${CONTAINER} ${config.hero.fitMode === "screen" ? "h-full" : ""}`}>
        <div className="relative overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_18px_55px_rgba(10,32,54,0.12)]">
          {/* Fixed slide frame: every hero page occupies exactly the same footprint. */}
          <div className="relative h-[410px] min-h-0 sm:h-[370px] xl:h-[390px]">
            {slides.map((slide, index) => {
              const activeSlide = index === active;
              const image = img(slide.image, PROPERTY_IMAGES.residential);
              const secondaryHref = slide.secondaryHref;
              return (
                <article
                  key={slide.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
                  aria-hidden={!activeSlide}
                  className={`absolute inset-0 grid lg:grid-cols-[1.04fr_1.25fr] transition-[opacity,transform] ease-in-out ${
                    activeSlide
                      ? "z-10 translate-x-0 opacity-100"
                      : "pointer-events-none z-0 translate-x-2 opacity-0"
                  }`}
                  style={{ transitionDuration: `${prefersReducedMotion ? 0 : config.hero.transitionMs}ms` }}
                >
                  <div className="relative z-10 flex min-h-0 min-w-0 flex-col justify-center overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f7fbff_58%,#edf5fb_100%)] px-5 py-7 sm:px-8 sm:py-8 lg:px-10 xl:px-12">
                    <div className="min-w-0 max-w-[540px]">
                      <p className={`${EYEBROW} sm:text-sm`}>
                        {softCase(slide.eyebrow)}
                      </p>
                      <div className="mt-4 flex items-start gap-3">
                        <h1 className="min-w-0 max-w-[640px] flex-1 line-clamp-4 text-balance font-heading text-[clamp(1.85rem,3.4vw,3.3rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-navy-deep">
                          {slide.title}
                        </h1>
                        <div className="hidden w-[82px] shrink-0 pt-3 text-right sm:block" aria-hidden>
                          {slide.signature.slice(0, 3).map((line) => (
                            <div key={line} className="font-serif text-[20px] italic leading-[1] text-primary/60">
                              {line}
                            </div>
                          ))}
                          <div className="mt-1 h-1.5 w-14 rounded-full bg-primary/70" />
                        </div>
                      </div>
                      <p className="mt-4 max-w-[46ch] text-[15px] leading-7 text-muted-foreground sm:text-base">
                        {slide.copy}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        <Button
                          asChild
                          tabIndex={activeSlide ? 0 : -1}
                          className="btn-brand h-11 rounded-xl px-5 text-sm font-semibold"
                        >
                          <Link tabIndex={activeSlide ? 0 : -1} to={slide.primaryHref}>
                            {slide.primaryLabel}
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          tabIndex={activeSlide ? 0 : -1}
                          variant="outline"
                          className="h-11 rounded-xl border-primary/25 bg-white px-5 text-sm font-semibold text-navy-deep hover:bg-muted"
                        >
                          <NavLink tabIndex={activeSlide ? 0 : -1} href={secondaryHref}>
                            {slide.secondaryLabel}
                          </NavLink>
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="relative min-h-0 overflow-hidden">
                    <picture>
                      <source media="(max-width: 640px)" srcSet={img(slide.mobileImage, image)} />
                      <img
                      src={image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                    </picture>
                    <div
                      className={`absolute inset-0 ${
                        config.hero.overlay === "strong"
                          ? "bg-navy-deep/40"
                          : config.hero.overlay === "medium"
                            ? "bg-navy-deep/20"
                            : "bg-navy-deep/10"
                      }`}
                    />
                  </div>
                </article>
              );
            })}

            {promos.length ? (
              <div className="absolute inset-y-3 right-3 z-20 hidden w-[24%] min-w-[245px] max-w-[325px] flex-col gap-2.5 lg:flex xl:right-4">
                {promos.map((promo) => (
                  <NavLink
                    key={promo.id}
                    href={promo.href}
                    className={`group relative min-h-[74px] overflow-hidden rounded-xl border border-white/60 bg-white/95 shadow-lg backdrop-blur-sm ${FOCUS_RING}`}
                  >
                    <img
                      src={img(promo.image, PROPERTY_IMAGES.office)}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-30 transition motion-safe:duration-500 motion-safe:group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/35" />
                    <div className="relative flex h-full items-center gap-3 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                          {promo.label}
                        </span>
                        <p className="mt-1 truncate text-[13px] font-semibold text-navy-deep">{promo.title}</p>
                        <p className="truncate text-[13px] text-muted-foreground">{promo.copy}</p>
                      </div>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </NavLink>
                ))}
              </div>
            ) : null}

            {slides.length > 1 ? (
              <div className="absolute bottom-3 right-4 z-30 flex items-center gap-1.5 sm:bottom-12 sm:right-6">
                <button
                  aria-label="Previous slide"
                  onClick={previous}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-navy-deep/50 text-white backdrop-blur transition hover:bg-navy-deep/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5 rounded-full bg-navy-deep/45 px-2.5 py-2 backdrop-blur" role="group" aria-label="Choose slide">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setActive(index)}
                      aria-label={`Show slide ${index + 1}: ${slide.title}`}
                      aria-current={index === active}
                      className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${index === active ? "w-5 bg-white" : "w-2 bg-white/55 hover:bg-white/80"}`}
                    />
                  ))}
                  <span aria-live="polite" className="sr-only">Slide {active + 1} of {slides.length}</span>
                </div>
                <button
                  aria-label="Next slide"
                  onClick={next}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-navy-deep/50 text-white backdrop-blur transition hover:bg-navy-deep/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          <div className="relative z-20 border-t border-border/70 bg-white/95 px-4 py-2.5 backdrop-blur sm:px-6 lg:pr-[27%]">
            <div className="flex flex-wrap items-center gap-2.5">
              {(pills.length ? pills : DEFAULT_PUBLIC_SITE_CONFIG.hero.pills).map((pill) => {
                const Icon = HERO_PILL_ICONS[pill.icon];
                return (
                  <span
                    key={pill.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[13px] font-medium text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                    {pill.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {heroMarketingAd ? <div className="pointer-events-auto absolute z-40 hidden w-[270px] md:block lg:w-[300px]" style={{ right: "1.5rem", top: "1.5rem" }}><AdCard ad={heroMarketingAd}/></div> : null}
    </section>
  );
}

function SectionHeading({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: ReactNode }) {
  return <div className="mb-5 flex min-w-0 items-end justify-between gap-3"><div className="min-w-0">{eyebrow ? <p className={EYEBROW}>{softCase(eyebrow)}</p> : null}<h2 className="mt-1 max-w-3xl text-balance font-heading text-[clamp(1.6rem,2.5vw,2.1rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-navy-deep">{title}</h2>{copy ? <p className="mt-2 max-w-[60ch] text-[15px] leading-7 text-muted-foreground">{copy}</p> : null}</div>{action ? <div className="shrink-0">{action}</div> : null}</div>;
}

function PropertyTypes({ items, ads = [] }: { items: PublicSiteConfig["propertyTypes"]; ads?: PublicSiteMarketingAd[] }) {
  const visible = items.filter((item) => item?.enabled);
  return <section id="property-types" className="bg-background py-6 sm:py-8"><div className={CONTAINER}><SectionHeading eyebrow="EXPLORE PROPERTY TYPES" title="Different properties. Smarter management." action={<div className="hidden items-center gap-1.5 sm:flex"><NavLink href="/discover/residential" className={`ml-1 rounded-full border border-border bg-white px-3.5 py-2 text-[13px] font-semibold text-navy-deep transition-colors hover:border-primary/40 hover:text-primary ${FOCUS_RING}`}>Browse listings <ArrowRight className="ml-1 inline h-3 w-3" aria-hidden /></NavLink></div>} /><div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-pl-3 pb-3 [scrollbar-width:none] max-sm:-mx-3 max-sm:px-3 sm:grid sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">{visible.map((item) => { const Icon = PROPERTY_ICONS[item.icon] ?? Building2; const replacement = replacementAd(ads, item.id); if (replacement) return <AdCard key={item.id} ad={replacement} className="min-h-[168px]"/>; return <NavLink key={item.id} href={item.href} className={`group min-w-0 snap-start max-sm:w-[78%] max-sm:shrink-0 overflow-hidden ${CARD_LINK}`}><div className="relative h-[104px] overflow-hidden sm:h-[108px]"><img src={img(item.image, PROPERTY_IMAGES.residential)} alt="" className="h-full w-full object-cover motion-safe:transition motion-safe:duration-500 motion-safe:group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-navy-deep/45 to-transparent"/></div><div className="relative flex min-h-[64px] items-center gap-3 px-3 py-2.5"><span className="-mt-9 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-white bg-white text-primary shadow-sm"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate font-heading text-[17px] font-semibold text-navy-deep">{item.title}</h3><p className="line-clamp-2 text-sm leading-5 text-muted-foreground">{item.description}</p></div><span className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/35 text-primary"><ArrowRight className="h-3.5 w-3.5" /></span></div></NavLink>; })}</div></div></section>;
}

function Portals({ items, ads = [] }: { items: PublicSiteConfig["portals"]; ads?: PublicSiteMarketingAd[] }) {
  const visible = items.filter((item) => item?.enabled);
  const { identities } = usePortalIdentity();
  const portalFeatures: Record<PublicSiteConfig["portals"][number]["id"], string[]> = {
    agency: ["Clients", "Portfolios", "Opportunities"],
    manager: ["Operations", "Maintenance", "Compliance"],
    landlord: ["Earnings", "Properties", "Insights"],
    tenant: ["Payments", "Requests", "Updates"],
  };
  return <section id="portals" className="bg-[radial-gradient(circle_at_50%_0%,rgba(18,63,183,0.055),transparent_42%),#F4F7FB] py-6 sm:py-8"><div className={CONTAINER}><SectionHeading eyebrow="ACCESS YOUR PORTAL" title="Choose your portal to get started." copy="Different needs. One connected property platform."/><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{visible.map((item) => {
    const Icon = PORTAL_ICONS[item.id] ?? Building2;
    const accent = identities[item.id]?.primaryHex || PORTAL_COLORS[item.id];
    const replacement = replacementAd(ads, item.id);
    if (replacement) return <AdCard key={item.id} ad={replacement} className="min-h-[180px] sm:min-h-[188px]" />;
    return <NavLink key={item.id} href={item.href} className={`group flex min-w-0 flex-col overflow-hidden ${CARD_LINK}`}>
      <div className="relative h-[84px] overflow-hidden sm:h-[132px]">
        <img src={img(item.image, PROPERTY_IMAGES.office)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent"/>
        <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ backgroundColor: accent }} aria-hidden />
        <span className="absolute right-2 top-2 flex h-8 w-8 sm:right-3 sm:top-3 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/60 bg-white/90 shadow-sm backdrop-blur-sm" style={{ color: accent }}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="flex min-h-[64px] min-w-0 items-center gap-2 px-3 py-2.5 sm:min-h-[76px] sm:gap-2.5 sm:px-3.5 sm:py-3">
        <div className="min-w-0 flex-1">
          {softCase(item.eyebrow).toLowerCase() !== item.title.replace(" Portal", "").toLowerCase() ? <p className="truncate text-xs font-semibold" style={{ color: accent }}>{softCase(item.eyebrow)}</p> : null}
          <h3 className="truncate font-heading text-base font-semibold text-navy-deep">{item.title.replace(" Portal", "")}</h3>
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition group-hover:border-primary/25 group-hover:text-primary"><ArrowRight className="h-3.5 w-3.5"/></span>
      </div>
    </NavLink>;
  })}</div></div></section>;
}

function WhyChoose({ config, ads = [] }: { config: PublicSiteConfig["why"]; ads?: PublicSiteMarketingAd[] }) {
  return <section id="why" className="bg-background py-4 sm:py-6"><div className={CONTAINER}><div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border/70 bg-[linear-gradient(90deg,#ffffff,#f4f8ff)] px-3.5 py-3 sm:flex-row sm:items-center sm:px-4"><div className="w-full min-w-0 sm:max-w-[285px]"><p className={EYEBROW}>{softCase(config.eyebrow)}</p><h2 className="mt-1 font-heading text-lg font-semibold leading-tight tracking-[-0.03em] text-navy-deep">{config.title}</h2>{config.copy ? <p className="mt-1 text-[13px] text-muted-foreground">{config.copy}</p> : null}</div><div className="grid min-w-0 flex-1 grid-cols-2 gap-2 xl:grid-cols-4">{config.cards.filter((card) => card.enabled).map((card) => { const Icon = WHY_ICONS[card.icon] ?? Sparkles; const replacement = replacementAd(ads, card.id); if (replacement) return <AdCard key={card.id} ad={replacement} className="min-h-[88px]"/>; return <div key={card.id} className="flex min-w-0 items-start gap-2 rounded-xl bg-white/90 px-2.5 py-2 shadow-[0_4px_14px_rgba(16,42,67,0.06)]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-4 w-4"/></span><div className="min-w-0"><h3 className="text-sm font-semibold leading-5 text-navy-deep">{card.title}</h3><p className="mt-0.5 overflow-hidden text-[13px] leading-5 text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">{card.copy}</p></div></div>; })}</div></div></div></section>;
}

function Featured({ items, ads = [] }: { items: PublicSiteConfig["featured"]; ads?: PublicSiteMarketingAd[] }) {
  const visible = items.filter((item) => item?.enabled);
  return <section id="featured" className="bg-muted/20 py-6 sm:py-8"><div className={CONTAINER}><SectionHeading eyebrow="FEATURED PROPERTIES" title="Discover premium properties across every sector." action={<div className="hidden items-center gap-1.5 sm:flex"><NavLink href="/discover/residential" className={`ml-1 rounded-full border border-border bg-white px-3.5 py-2 text-[13px] font-semibold text-navy-deep transition-colors hover:border-primary/40 hover:text-primary ${FOCUS_RING}`}>Browse listings <ArrowRight className="ml-1 inline h-3 w-3" aria-hidden /></NavLink></div>} />{visible.length ? <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-pl-3 pb-3 [scrollbar-width:none] max-sm:-mx-3 max-sm:px-3 sm:grid sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">{visible.map((item) => { const replacement = replacementAd(ads, item.id); if (replacement) return <AdCard key={item.id} ad={replacement} className="min-h-[220px]"/>; return <NavLink key={item.id} href={item.href} className={`group snap-start max-sm:w-[78%] max-sm:shrink-0 overflow-hidden ${CARD_LINK}`}><div className="relative h-[132px] overflow-hidden"><img src={img(item.image, PROPERTY_IMAGES.residential)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/><span className="absolute right-2 top-2 max-w-[60%] truncate rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-navy-deep shadow-sm">{item.price}</span></div><div className="min-h-[104px] p-3.5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-semibold text-primary">{softCase(item.eyebrow)}</p><h3 className="truncate mt-0.5 font-heading text-[17px] font-semibold text-navy-deep">{item.title}</h3></div></div><p className="truncate mt-1 text-sm text-muted-foreground">{item.location}</p><div className="mt-2 flex min-w-0 items-center justify-between gap-2 text-sm text-muted-foreground"><span className="line-clamp-2 min-w-0 inline-flex items-start gap-1 leading-5"><Home className="mt-1 h-3 w-3 shrink-0 text-primary" aria-hidden/>{item.detail}</span><ArrowRight className="h-3.5 w-3.5 text-primary transition group-hover:translate-x-1"/></div></div></NavLink>; })}</div> : <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center text-xs text-muted-foreground">No featured properties are published yet. Browse all listings to see what is available.</div>}</div></section>;
}

function RailSearch({ config }: { config: PublicSiteConfig["search"] }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(config.tabs.find((tab) => tab.enabled)?.id ?? "all");
  const [term, setTerm] = useState("");
  const categoryByMode: Record<string, string> = { buy: "residential", rent: "residential", offices: "offices", estates: "estates", institutions: "institutions", all: "residential" };
  const submit = (event: FormEvent) => { event.preventDefault(); navigate(`/discover/${categoryByMode[mode] ?? "residential"}?mode=${encodeURIComponent(mode)}&q=${encodeURIComponent(term.trim())}`); };
  const chips = config.chips.filter((chip) => chip.enabled);
  return <section id="quick-search" className="rounded-xl border border-border bg-white p-3 shadow-[0_6px_18px_rgba(16,42,67,0.07)]"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-heading text-base font-semibold text-navy-deep">{config.title}</h3><p className="truncate mt-0.5 text-[13px] text-muted-foreground">{config.copy}</p></div><Search className="h-4 w-4 text-primary"/></div><div className="mt-2 grid grid-cols-3 rounded-lg bg-muted p-0.5" role="group" aria-label="Search type">{config.tabs.filter((tab) => tab.enabled).map((tab) => <button key={tab.id} type="button" onClick={() => setMode(tab.id)} aria-pressed={mode === tab.id} className={`rounded-md px-2 py-2 text-xs font-semibold capitalize ${FOCUS_RING} ${mode === tab.id ? "bg-primary text-white" : "text-muted-foreground"}`}>{tab.label}</button>)}</div><form className="mt-2 flex gap-1.5" onSubmit={submit}><input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={config.placeholder} aria-label={config.title} className="min-h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"/><button type="submit" className={`flex w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white ${FOCUS_RING}`} aria-label="Search"><Search className="h-4 w-4"/></button></form><div className="mt-2 grid grid-cols-2 gap-1.5">{chips.map((chip) => { const Icon = PROPERTY_ICONS[chip.icon]; return <NavLink key={chip.id} href={chip.href} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-[13px] font-semibold text-muted-foreground hover:border-primary hover:text-primary"><Icon className="h-3 w-3 text-primary"/>{chip.label}</NavLink>; })}</div></section>;
}

function RailHighlights({ items }: { items: PublicSiteConfig["highlights"] }) {
  return <section className="rounded-xl border border-border bg-white p-3 shadow-[0_6px_18px_rgba(16,42,67,0.07)]"><div className="flex items-center justify-between"><h3 className="font-heading text-base font-semibold text-navy-deep">Platform highlights</h3><Sparkles className="h-4 w-4 text-primary"/></div><div className="mt-3 grid grid-cols-1 gap-2">{items.filter((item) => item.enabled).map((item) => { const Icon = HIGHLIGHT_ICONS[item.icon] ?? Sparkles; return <div key={item.id} className="rounded-lg border border-border bg-background px-2.5 py-2 shadow-sm"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10"><Icon className="h-4 w-4 text-primary" aria-hidden/></span><div className="min-w-0"><p className="font-heading text-base font-semibold leading-5 text-navy-deep">{item.value}</p><p className="text-[13px] leading-5 text-muted-foreground">{item.label}</p></div></div></div>; })}</div></section>;
}

function RailInsights({ items }: { items: PublicSiteConfig["insights"] }) {
  const published = items.filter((item) => item.enabled);
  if (!published.length) return null;
  return <section id="insights" className="rounded-xl border border-border bg-white p-3 shadow-[0_6px_18px_rgba(16,42,67,0.07)]"><div className="flex items-center justify-between"><h3 className="font-heading text-base font-semibold text-navy-deep">Latest insights</h3></div><div className="mt-2 space-y-1.5">{items.filter((item) => item.enabled).map((item) => <NavLink key={item.id} href={item.href} className="group flex items-center gap-2 rounded-lg border border-transparent px-1 py-1 transition hover:border-border hover:bg-background"><img src={img(item.image, PROPERTY_IMAGES.residential)} alt="" className="h-11 w-14 rounded-md object-cover"/><div className="min-w-0"><p className="text-xs font-semibold text-primary">{item.category}</p><h4 className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-5 text-navy-deep">{item.title}</h4><p className="mt-0.5 text-[13px] text-muted-foreground">{item.meta}</p></div><ArrowRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"/></NavLink>)}</div></section>;
}

function Trust({ config, ads = [] }: { config: PublicSiteConfig["trust"]; ads?: PublicSiteMarketingAd[] }) {
  const logos = config.logos.filter((logo) => logo.enabled);
  const hasTestimonial = Boolean(config.quote?.trim()) && !/public site studio/i.test(config.person ?? "");
  return <section id="trust" className="relative bg-background py-6 sm:py-8"><div className={CONTAINER}><div className={`grid gap-4 ${hasTestimonial ? "lg:grid-cols-[1.75fr_1fr]" : ""}`}>
    <div className="rounded-2xl border border-[#CFE0EF] bg-[linear-gradient(135deg,#F4F8FC_0%,#FFFFFF_48%,#F3FAF7_100%)] px-4 py-5 shadow-[0_8px_24px_rgba(16,42,67,0.07)] sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className={EYEBROW}>{softCase(config.eyebrow)}</p><h2 className="mt-1 text-balance font-heading text-[clamp(1.45rem,2.3vw,1.9rem)] font-semibold tracking-[-0.03em] text-navy-deep">{config.title}</h2>{config.copy && !/public site studio/i.test(config.copy) ? <p className="mt-2 max-w-[60ch] text-[15px] leading-7 text-muted-foreground">{config.copy}</p> : null}</div></div>
      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">{logos.map((logo) => { const replacement = replacementAd(ads, logo.id); if (replacement) return <AdCard key={logo.id} ad={replacement} className="min-h-[64px]"/>; return logo.href && logo.href !== "#" ? <NavLink key={logo.id} href={logo.href} className="group flex min-h-[64px] min-w-0 items-center justify-center rounded-xl border border-[#D7E2EC] bg-white px-3 py-3 shadow-[0_4px_12px_rgba(16,42,67,0.045)] transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_8px_18px_rgba(16,42,67,0.08)]">{logo.image ? <img src={logo.image} alt={logo.name} className="max-h-9 max-w-[92%] object-contain transition group-hover:scale-[1.02]"/> : <span className="truncate text-center font-heading text-sm font-bold tracking-tight text-navy-deep">{logo.name}</span>}</NavLink> : <div key={logo.id} className="flex min-h-[64px] min-w-0 items-center justify-center rounded-xl border border-[#D7E2EC] bg-white px-3 py-3 shadow-[0_4px_12px_rgba(16,42,67,0.045)]">{logo.image ? <img src={logo.image} alt={logo.name} className="max-h-9 max-w-[92%] object-contain"/> : <span className="truncate text-center font-heading text-sm font-bold tracking-tight text-navy-deep">{logo.name}</span>}</div>; })}</div>
      
    </div>
    {hasTestimonial ? <div className="rounded-2xl border border-[#D7E2EC] bg-white px-4 py-5 shadow-[0_8px_24px_rgba(16,42,67,0.07)] sm:px-6"><blockquote className="font-serif text-[17px] leading-7 text-navy-deep">“{config.quote}”</blockquote><div className="mt-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">{config.avatar ? <img src={config.avatar} alt="" className="h-full w-full object-cover"/> : config.person.charAt(0)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-navy-deep">{config.person}</p><p className="truncate text-[13px] text-muted-foreground">{config.role}</p></div></div></div> : null}
  </div></div></section>;
}

function CTA({ config }: { config: PublicSiteConfig["cta"] }) {
  return <section id="cta" className="bg-background py-4 sm:py-8"><div className={CONTAINER}><div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--calqulus-navy-900)_0%,var(--calqulus-navy-800)_62%,#061A2D_100%)] px-5 py-7 text-white shadow-[0_12px_34px_rgba(10,37,64,0.22)] sm:px-9 sm:py-9"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.14),transparent_34%),radial-gradient(circle_at_15%_100%,rgba(118,217,194,0.12),transparent_30%)]"/><div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 max-w-2xl"><p className="font-heading text-[13px] font-semibold text-white/85">{softCase(config.eyebrow)}</p><h2 className="mt-1 text-balance font-heading text-2xl font-semibold leading-[1.12] tracking-[-0.025em] text-white sm:text-[1.75rem]">{config.title}</h2><p className="mt-2 max-w-[52ch] text-sm leading-6 text-white/85">{config.copy}</p></div><div className="flex shrink-0 flex-wrap gap-2"><Button asChild className="h-11 rounded-xl bg-white px-5 text-sm font-semibold text-[var(--calqulus-navy-900)] shadow-sm hover:bg-white/90"><Link to={config.primaryHref}>{config.primaryLabel}<ArrowRight className="ml-1 h-3.5 w-3.5"/></Link></Button><Button asChild variant="outline" className="h-11 rounded-xl border-white/40 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/20 hover:text-white"><NavLink href={config.secondaryHref}>{config.secondaryLabel}</NavLink></Button></div></div></div></div></section>;
}

function MainContent({ config }: { config: PublicSiteConfig }) {
  const ordered = useMemo(() => [...config.sections].filter((section) => section.visible).sort((a, b) => a.order - b.order), [config.sections]);
  const renderMain = (id: PublicSiteSectionId) => { switch (id) { case "property-types": return <PropertyTypes key={id} items={config.propertyTypes} ads={config.marketingAds}/>; case "portals": return <Portals key={id} items={config.portals} ads={config.marketingAds}/>; case "why": return <WhyChoose key={id} config={config.why} ads={config.marketingAds}/>; case "featured": return <Featured key={id} items={config.featured} ads={config.marketingAds}/>; case "trust": return <Trust key={id} config={config.trust} ads={config.marketingAds}/>; case "cta": return <CTA key={id} config={config.cta}/>; default: return null; } };
  return <div className="min-w-0">{ordered.filter((s) => s.id !== "hero").map((section) => { const ad = overlayAd(config.marketingAds, section.id); return <div key={section.id} className="relative min-w-0">{renderMain(section.id)}{ad ? <div className={`absolute z-30 hidden max-w-[300px] md:block ${adPositionClass(ad.position)} ${section.id === "trust" ? "lg:hidden" : ""}`}><AdCard ad={ad}/></div> : null}</div>; })}</div>;
}

function Rail({ config }: { config: PublicSiteConfig }) {
  const ordered = useMemo(() => [...config.rail.sections].filter((section) => section.visible).sort((a, b) => a.order - b.order), [config.rail.sections]);
  const render = (id: PublicSiteRailId) => { switch (id) { case "search": return <RailSearch key={id} config={config.search}/>; case "highlights": return <RailHighlights key={id} items={config.highlights}/>; case "insights": return <RailInsights key={id} items={config.insights}/>; } };
  if (!config.rail.visible) return null;
  return <aside className={`${config.rail.width === "narrow" ? "lg:w-[260px]" : "lg:w-[292px] xl:w-[310px]"} min-w-0 shrink-0 space-y-4`} aria-label="Public site sidebar">{ordered.map((section) => render(section.id))}</aside>;
}

function HomeView() {
  const { data = DEFAULT_PUBLIC_SITE_CONFIG } = usePublicSiteConfig();
  const config = data ?? DEFAULT_PUBLIC_SITE_CONFIG;
  const heroVisible = config.sections.find((section) => section.id === "hero")?.visible ?? true;
  return <div className="bg-transparent overflow-x-clip">{heroVisible ? <Hero config={config}/> : null}<MobileQuickAccess portals={config.portals} searchVisible={config.rail.visible}/><div className={`${CONTAINER} flex min-w-0 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_292px] lg:items-start xl:grid-cols-[minmax(0,1fr)_310px] lg:gap-6`}><main className="min-w-0 overflow-hidden"><MainContent config={config}/></main><Rail config={config}/></div></div>;
}

function PricingView() { const { data: tiers = [] } = usePublicTiers(); return <section className={`${CONTAINER} py-10 sm:py-12`}><div className="mb-6 max-w-2xl"><p className={EYEBROW}>Pricing</p><h1 className="mt-1 text-balance font-heading text-3xl font-semibold tracking-tight text-navy-deep sm:text-4xl">Simple pricing for property operations.</h1><p className="mt-1 text-sm leading-6 text-muted-foreground">Published rates in Kenyan shillings, with custom options for larger portfolios.</p></div><PublicPricing tiers={tiers}/></section>; }

export function PublicLandingPage() { const { pathname } = useLocation(); const isPricing = pathname === PUBLIC_ROUTES.pricing; return <PublicShell>{isPricing ? <PricingView/> : <HomeView/>}</PublicShell>; }
export default PublicLandingPage;
