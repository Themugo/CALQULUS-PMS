import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, BarChart3, Building2, ChevronLeft, ChevronRight, Clock3, Cloud, FileStack, Home, Landmark, LayoutDashboard, Search, ShieldCheck, Sparkles, TrendingUp, Users, Wrench, Leaf, Settings2 } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { PublicPricing } from "@/features/marketing/components/PublicPricing";
import { PublicShell } from "@/features/marketing/components/PublicShell";
import { usePublicTiers } from "@/features/marketing/hooks/usePublicTiers";
import { usePublicSiteConfig } from "@/features/marketing/hooks/usePublicSiteConfig";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import { DEFAULT_PUBLIC_SITE_CONFIG, type PublicSiteConfig, type PublicSiteSectionId, type PublicSiteRailId } from "@/features/marketing/publicSiteConfig";

const CONTAINER = "mx-auto w-full max-w-[1480px] px-3 sm:px-4 lg:px-6";
const PROPERTY_ICONS = { home: Home, building: Building2, office: Building2, landmark: Landmark } as const;
const PORTAL_ICONS = { manager: LayoutDashboard, landlord: TrendingUp, agency: Users, tenant: Home } as const;
const PORTAL_GRADIENTS = {
  manager: "from-[#31577E] via-[#31577E]/90 to-transparent",
  landlord: "from-[#0F8A6A] via-[#0F8A6A]/80 to-transparent",
  agency: "from-[#0F766E] via-[#0F766E]/85 to-transparent",
  tenant: "from-[#8B4DE8] via-[#8B4DE8]/80 to-transparent",
} as const;
const WHY_ICONS = { stack: FileStack, gear: Settings2, chart: BarChart3, leaf: Leaf } as const;
const HERO_PILL_ICONS = { portals: Users, secure: ShieldCheck, insights: TrendingUp, reliable: Cloud } as const;
const HIGHLIGHT_ICONS = { property: Building2, users: Users, uptime: Clock3, support: ShieldCheck } as const;

function img(url: string | null | undefined, fallback: string) { return typeof url === "string" && url.trim() ? url : fallback; }
function isExternal(href: string) { return /^https?:\/\//i.test(href); }
function NavLink({ href, children, onClick, className = "" }: { href: string; children: ReactNode; onClick?: () => void; className?: string }) {
  if (href.startsWith("#")) return <a href={href} onClick={onClick} className={className}>{children}</a>;
  if (isExternal(href)) return <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={className}>{children}</a>;
  return <Link to={href} onClick={onClick} className={className}>{children}</Link>;
}

function Hero({ config }: { config: PublicSiteConfig }) {
  const enabledSlides = config.hero.slides.filter((slide) => slide?.enabled);
  const slides = enabledSlides.length ? enabledSlides : DEFAULT_PUBLIC_SITE_CONFIG.hero.slides;
  const enabledPromos = config.hero.floatingCards.filter((card) => card?.enabled).slice(0, 3);
  const promos = enabledPromos.length ? enabledPromos : DEFAULT_PUBLIC_SITE_CONFIG.hero.floatingCards;
  const pills = config.hero.pills.filter((pill) => pill?.enabled);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!config.hero.autoplay || slides.length < 2) return;
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % slides.length),
      config.hero.intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [config.hero.autoplay, config.hero.intervalMs, slides.length]);

  useEffect(() => {
    setActive((value) => Math.min(value, Math.max(slides.length - 1, 0)));
  }, [slides.length]);

  const previous = () => setActive((value) => (value - 1 + slides.length) % slides.length);
  const next = () => setActive((value) => (value + 1) % slides.length);

  return (
    <section
      className={`relative overflow-hidden py-2 sm:py-3 ${
        config.hero.fitMode === "screen" ? "min-h-[calc(100svh-72px)]" : ""
      }`}
    >
      <div className={`${CONTAINER} ${config.hero.fitMode === "screen" ? "h-full" : ""}`}>
        <div className="relative overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_18px_55px_rgba(10,32,54,0.12)]">
          {/* Fixed slide frame: every hero page occupies exactly the same footprint. */}
          <div className="relative h-[350px] sm:h-[370px] xl:h-[390px]">
            {slides.map((slide, index) => {
              const activeSlide = index === active;
              const image = img(slide.image, PROPERTY_IMAGES.residential);
              const secondaryHref = slide.secondaryHref;
              return (
                <article
                  key={slide.id}
                  aria-hidden={!activeSlide}
                  className={`absolute inset-0 grid lg:grid-cols-[1.04fr_1.25fr] transition-all duration-700 ease-out ${
                    activeSlide
                      ? "z-10 translate-x-0 opacity-100"
                      : "pointer-events-none z-0 translate-x-2 opacity-0"
                  }`}
                >
                  <div className="relative z-10 flex min-w-0 flex-col justify-center overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f5faf8_72%,#edf7f3_100%)] px-5 py-7 sm:px-8 sm:py-8 lg:px-10 xl:px-12">
                    <div className="max-w-[560px]">
                      <p className="text-[10px] font-semibold tracking-[0.28em] text-primary sm:text-[11px]">
                        {slide.eyebrow}
                      </p>
                      <div className="mt-4 flex items-start gap-3">
                        <h1 className="font-heading text-[clamp(2.2rem,4.3vw,4.1rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-navy-deep">
                          {slide.title}
                        </h1>
                        <div className="hidden shrink-0 pt-3 text-right sm:block" aria-hidden>
                          {slide.signature.slice(0, 3).map((line) => (
                            <div key={line} className="font-serif text-[20px] italic leading-[0.95] text-primary/75">
                              {line}
                            </div>
                          ))}
                          <div className="mt-1 h-1.5 w-14 rounded-full bg-success/75" />
                        </div>
                      </div>
                      <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                        {slide.copy}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2.5">
                        <Button
                          asChild
                          tabIndex={activeSlide ? 0 : -1}
                          className="btn-brand h-10 rounded-xl px-5 text-sm font-semibold"
                        >
                          <Link to={slide.primaryHref}>
                            {slide.primaryLabel}
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          tabIndex={activeSlide ? 0 : -1}
                          variant="outline"
                          className="h-10 rounded-xl border-primary/20 bg-white px-5 text-sm font-semibold text-navy-deep hover:bg-muted"
                        >
                          <NavLink href={secondaryHref}>
                            {slide.secondaryLabel}
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </NavLink>
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="relative min-h-0 overflow-hidden">
                    <img
                      src={image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
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
                    className="group relative min-h-[74px] overflow-hidden rounded-xl border border-white/50 bg-white/92 shadow-lg backdrop-blur-sm"
                  >
                    <img
                      src={img(promo.image, PROPERTY_IMAGES.office)}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-30 transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/35" />
                    <div className="relative flex h-full items-center gap-3 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex rounded-md bg-success px-2 py-0.5 text-[8px] font-bold tracking-[0.16em] text-navy-deep">
                          {promo.label}
                        </span>
                        <p className="mt-1 truncate text-[12px] font-semibold text-navy-deep">{promo.title}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{promo.copy}</p>
                      </div>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-navy-deep">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </NavLink>
                ))}
              </div>
            ) : null}

            {slides.length > 1 ? (
              <div className="absolute bottom-12 right-4 z-30 flex items-center gap-1.5 sm:right-6">
                <button
                  aria-label="Previous hero slide"
                  onClick={previous}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-navy-deep/35 text-white backdrop-blur transition hover:bg-navy-deep/55"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span aria-live="polite" className="rounded-full bg-navy-deep/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
                  {active + 1}/{slides.length}
                </span>
                <button
                  aria-label="Next hero slide"
                  onClick={next}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-navy-deep/35 text-white backdrop-blur transition hover:bg-navy-deep/55"
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {pill.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: ReactNode }) {
  return <div className="mb-3 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.22em] text-primary sm:text-[11px]">{eyebrow}</p><h2 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.04em] text-navy-deep sm:text-[30px]">{title}</h2>{copy ? <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">{copy}</p> : null}</div>{action}</div>;
}

function PropertyTypes({ items }: { items: PublicSiteConfig["propertyTypes"] }) {
  const visible = items.filter((item) => item?.enabled);
  return <section id="property-types" className="bg-background py-3 sm:py-4"><div className={CONTAINER}><SectionHeading eyebrow="EXPLORE PROPERTY TYPES" title="Different properties. Smarter management." action={<div className="hidden items-center gap-1.5 sm:flex"><button className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-navy-deep"><ChevronLeft className="h-4 w-4" /></button><button className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-navy-deep"><ChevronRight className="h-4 w-4" /></button><NavLink href="#property-types" className="ml-1 rounded-full border border-border bg-white px-3 py-1.5 text-[10px] font-semibold text-navy-deep">View All Types <ArrowRight className="ml-1 inline h-3 w-3" /></NavLink></div>} /><div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">{visible.map((item) => { const Icon = PROPERTY_ICONS[item.icon]; return <NavLink key={item.id} href={item.href} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="relative h-[102px] overflow-hidden sm:h-[112px]"><img src={img(item.image, PROPERTY_IMAGES.residential)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-navy-deep/50 to-transparent"/></div><div className="relative flex items-center gap-3 px-3 py-2.5"><span className="-mt-9 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-white bg-white text-primary shadow-sm"><Icon className="h-5 w-5" /></span><div className="min-w-0"><h3 className="font-heading text-sm font-semibold text-navy-deep">{item.title}</h3><p className="truncate text-[10px] text-muted-foreground">{item.description}</p></div><span className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-success/40 text-success"><ArrowRight className="h-3.5 w-3.5" /></span></div></NavLink>; })}</div></div></section>;
}

function Portals({ items }: { items: PublicSiteConfig["portals"] }) {
  const visible = items.filter((item) => item?.enabled);
  return <section id="portals" className="bg-background py-3 sm:py-4"><div className={CONTAINER}><SectionHeading eyebrow="ACCESS YOUR PORTAL" title="Choose your portal to get started." /><div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">{visible.map((item) => { const Icon = PORTAL_ICONS[item.id]; const accent = PORTAL_GRADIENTS[item.id]; return <NavLink key={item.id} href={item.href} className="group relative min-h-[150px] overflow-hidden rounded-xl border border-border bg-navy-deep text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><img src={img(item.image, PROPERTY_IMAGES.office)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-65 transition duration-500 group-hover:scale-105"/><div className={`absolute inset-0 bg-gradient-to-r ${accent}`}/><div className="relative flex h-full flex-col justify-between p-3.5"><div className="flex items-start gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10"><Icon className="h-4.5 w-4.5" /></span><div><p className="text-[8px] font-bold tracking-[0.16em] text-white/75">{item.eyebrow}</p><h3 className="mt-0.5 font-heading text-base font-semibold">{item.title.replace(" Portal", "")}</h3></div></div><div><p className="max-w-[235px] text-[10px] leading-4 text-white/75">{item.description}</p><span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur group-hover:bg-white/25">Access Portal <ArrowRight className="h-3 w-3"/></span></div></div></NavLink>; })}</div></div></section>;
}

function WhyChoose({ config }: { config: PublicSiteConfig["why"] }) {
  return <section id="why" className="bg-background py-2 sm:py-3"><div className={CONTAINER}><div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-[linear-gradient(90deg,#ffffff,#f5fbf8)] px-3.5 py-3 sm:flex-row sm:items-center sm:px-4"><div className="w-full sm:max-w-[285px]"><p className="text-[10px] font-bold tracking-[0.22em] text-primary">{config.eyebrow}</p><h2 className="mt-1 font-heading text-lg font-semibold tracking-[-0.03em] text-navy-deep">{config.title}</h2>{config.copy ? <p className="mt-1 text-[10px] text-muted-foreground">{config.copy}</p> : null}</div><div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-4">{config.cards.filter((card) => card.enabled).map((card) => { const Icon = WHY_ICONS[card.icon]; return <div key={card.id} className="flex items-start gap-2 rounded-xl bg-white/80 px-2.5 py-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-primary"><Icon className="h-4 w-4"/></span><div><h3 className="text-[10px] font-bold text-navy-deep">{card.title}</h3><p className="mt-0.5 text-[9px] leading-3.5 text-muted-foreground">{card.copy}</p></div></div>; })}</div></div></div></section>;
}

function Featured({ items }: { items: PublicSiteConfig["featured"] }) {
  const visible = items.filter((item) => item?.enabled);
  return <section id="featured" className="bg-background py-3 sm:py-4"><div className={CONTAINER}><SectionHeading eyebrow="FEATURED PROPERTIES" title="Discover premium properties across every sector." action={<div className="hidden items-center gap-1.5 sm:flex"><button className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white"><ChevronLeft className="h-4 w-4" /></button><button className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white"><ChevronRight className="h-4 w-4" /></button><NavLink href="#featured" className="ml-1 rounded-full border border-border bg-white px-3 py-1.5 text-[10px] font-semibold text-navy-deep">View All Properties <ArrowRight className="ml-1 inline h-3 w-3" /></NavLink></div>} />{visible.length ? <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">{visible.map((item) => <NavLink key={item.id} href={item.href} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="relative h-[122px] overflow-hidden"><img src={img(item.image, PROPERTY_IMAGES.residential)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/><span className="absolute right-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[9px] font-bold text-navy-deep">{item.price}</span></div><div className="p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-primary">{item.eyebrow}</p><h3 className="mt-0.5 font-heading text-sm font-semibold text-navy-deep">{item.title}</h3></div><span className="rounded-full bg-success/10 px-2 py-1 text-[8px] font-bold text-primary">Available</span></div><p className="mt-1 text-[9px] text-muted-foreground">{item.location}</p><div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Home className="h-3 w-3 text-primary"/>{item.detail}</span><ArrowRight className="h-3.5 w-3.5 text-primary transition group-hover:translate-x-1"/></div></div></NavLink>)}</div> : <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center text-xs text-muted-foreground">Featured listings will appear here when published in Public Site Studio.</div>}</div></section>;
}

function RailSearch({ config }: { config: PublicSiteConfig["search"] }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(config.tabs.find((tab) => tab.enabled)?.id ?? "all");
  const [term, setTerm] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); navigate(`/discover/residential?mode=${encodeURIComponent(mode)}&q=${encodeURIComponent(term.trim())}`); };
  const chips = config.chips.filter((chip) => chip.enabled);
  return <section id="quick-search" className="rounded-xl border border-border bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-2"><div><h3 className="font-heading text-base font-semibold text-navy-deep">{config.title}</h3><p className="mt-0.5 text-[10px] text-muted-foreground">{config.copy}</p></div><Search className="h-4 w-4 text-primary"/></div><div className="mt-2 grid grid-cols-3 rounded-lg bg-muted p-0.5">{config.tabs.filter((tab) => tab.enabled).map((tab) => <button key={tab.id} type="button" onClick={() => setMode(tab.id)} className={`rounded-md px-2 py-1.5 text-[9px] font-bold capitalize ${mode === tab.id ? "bg-success text-navy-deep" : "text-muted-foreground"}`}>{tab.label}</button>)}</div><form className="mt-2 flex gap-1.5" onSubmit={submit}><input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={config.placeholder} className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 py-2 text-[10px] outline-none focus:ring-2 focus:ring-primary/20"/><button className="flex w-9 shrink-0 items-center justify-center rounded-lg bg-success text-navy-deep" aria-label="Search"><Search className="h-4 w-4"/></button></form><div className="mt-2 grid grid-cols-2 gap-1.5">{chips.map((chip) => { const Icon = PROPERTY_ICONS[chip.icon]; return <NavLink key={chip.id} href={chip.href} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-[8px] font-semibold text-muted-foreground hover:border-success hover:text-primary"><Icon className="h-3 w-3 text-primary"/>{chip.label}</NavLink>; })}</div></section>;
}

function RailHighlights({ items }: { items: PublicSiteConfig["highlights"] }) {
  return <section className="rounded-xl border border-border bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-heading text-base font-semibold text-navy-deep">Platform Highlights</h3><Sparkles className="h-4 w-4 text-primary"/></div><div className="mt-2 grid grid-cols-2 gap-1.5">{items.filter((item) => item.enabled).map((item) => { const Icon = HIGHLIGHT_ICONS[item.icon]; return <div key={item.id} className="rounded-lg border border-border bg-background px-2.5 py-2"><div className="flex items-center gap-1.5"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10"><Icon className="h-3.5 w-3.5 text-primary"/></span><div><p className="font-heading text-sm font-semibold text-navy-deep">{item.value}</p><p className="text-[8px] leading-3 text-muted-foreground">{item.label}</p></div></div></div>; })}</div></section>;
}

function RailInsights({ items }: { items: PublicSiteConfig["insights"] }) {
  return <section id="insights" className="rounded-xl border border-border bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-heading text-base font-semibold text-navy-deep">Latest Insights</h3><NavLink href="#insights" className="rounded-full border border-border px-2 py-1 text-[8px] font-semibold text-primary">View All <ArrowRight className="ml-0.5 inline h-2.5 w-2.5"/></NavLink></div><div className="mt-2 space-y-1.5">{items.filter((item) => item.enabled).map((item) => <NavLink key={item.id} href={item.href} className="group flex items-center gap-2 rounded-lg border border-transparent px-1 py-1 hover:border-border hover:bg-background"><img src={img(item.image, PROPERTY_IMAGES.residential)} alt="" className="h-11 w-14 rounded-md object-cover"/><div className="min-w-0"><p className="text-[8px] font-semibold text-primary">{item.category}</p><h4 className="mt-0.5 truncate text-[9px] font-semibold text-navy-deep">{item.title}</h4><p className="mt-0.5 text-[8px] text-muted-foreground">{item.meta}</p></div><ArrowRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"/></NavLink>)}</div></section>;
}

function Trust({ config }: { config: PublicSiteConfig["trust"] }) {
  const logos = config.logos.filter((logo) => logo.enabled);
  return <section id="trust" className="bg-background py-3 sm:py-4"><div className={CONTAINER}><div className="grid gap-2.5 lg:grid-cols-[1.7fr_1fr]"><div className="rounded-2xl border border-border bg-[linear-gradient(135deg,#f5fbf8,#ffffff)] px-4 py-4 sm:px-5"><p className="text-[10px] font-bold tracking-[0.22em] text-primary">{config.eyebrow}</p><h2 className="mt-1 font-heading text-xl font-semibold tracking-[-0.03em] text-navy-deep">{config.title}</h2><p className="mt-1 max-w-3xl text-[10px] leading-4.5 text-muted-foreground">{config.copy}</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">{logos.map((logo) => <NavLink key={logo.id} href={logo.href} className="flex h-9 items-center justify-center rounded-lg border border-border bg-white px-2 text-[10px] font-bold text-muted-foreground grayscale transition hover:grayscale-0">{logo.image ? <img src={logo.image} alt={logo.name} className="max-h-5 max-w-full object-contain"/> : logo.name}</NavLink>)}</div></div><div className="rounded-2xl border border-border bg-white px-4 py-4 sm:px-5"><p className="text-[18px] leading-6 text-primary">❝</p><p className="mt-1 text-[11px] leading-4.5 text-navy-deep">{config.quote}</p><div className="mt-3 flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-success/15 text-sm font-bold text-primary">{config.avatar ? <img src={config.avatar} alt="" className="h-full w-full object-cover"/> : config.person.charAt(0)}</div><div><p className="text-[10px] font-semibold text-navy-deep">{config.person}</p><p className="text-[9px] text-muted-foreground">{config.role}</p></div></div></div></div></div></section>;
}

function CTA({ config }: { config: PublicSiteConfig["cta"] }) {
  return <section id="cta" className="bg-background py-2 sm:py-3"><div className={CONTAINER}><div className="relative overflow-hidden rounded-2xl bg-navy-deep px-4 py-5 text-white shadow-lg sm:px-7"><div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(46,186,136,0.2),transparent_30%)]"/><div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="max-w-2xl"><p className="text-[10px] font-bold tracking-[0.22em] text-success">{config.eyebrow}</p><h2 className="mt-1 font-heading text-xl font-semibold leading-tight sm:text-2xl">{config.title}</h2><p className="mt-1 text-[10px] leading-4 text-white/65 sm:text-xs">{config.copy}</p></div><div className="flex shrink-0 gap-2"><Button asChild className="h-9 rounded-lg bg-success px-4 text-xs font-bold text-navy-deep hover:bg-success/90"><Link to={config.primaryHref}>{config.primaryLabel}<ArrowRight className="ml-1 h-3.5 w-3.5"/></Link></Button><Button asChild variant="outline" className="h-9 rounded-lg border-white/25 bg-white/5 px-4 text-xs font-semibold text-white hover:bg-white/10 hover:text-white"><NavLink href={config.secondaryHref}>{config.secondaryLabel}</NavLink></Button></div></div></div></div></section>;
}

function MainContent({ config }: { config: PublicSiteConfig }) {
  const ordered = useMemo(() => [...config.sections].filter((section) => section.visible).sort((a, b) => a.order - b.order), [config.sections]);
  const renderMain = (id: PublicSiteSectionId) => { switch (id) { case "property-types": return <PropertyTypes key={id} items={config.propertyTypes}/>; case "portals": return <Portals key={id} items={config.portals}/>; case "why": return <WhyChoose key={id} config={config.why}/>; case "featured": return <Featured key={id} items={config.featured}/>; case "trust": return <Trust key={id} config={config.trust}/>; case "cta": return <CTA key={id} config={config.cta}/>; default: return null; } };
  return <>{ordered.filter((s) => s.id !== "hero").map((section) => renderMain(section.id))}</>;
}

function Rail({ config }: { config: PublicSiteConfig }) {
  const ordered = useMemo(() => [...config.rail.sections].filter((section) => section.visible).sort((a, b) => a.order - b.order), [config.rail.sections]);
  const render = (id: PublicSiteRailId) => { switch (id) { case "search": return <RailSearch key={id} config={config.search}/>; case "highlights": return <RailHighlights key={id} items={config.highlights}/>; case "insights": return <RailInsights key={id} items={config.insights}/>; } };
  if (!config.rail.visible) return null;
  return <aside className={`${config.rail.width === "narrow" ? "lg:w-[250px]" : "lg:w-[300px] xl:w-[320px]"} shrink-0 space-y-2.5`} aria-label="Public site sidebar">{ordered.map((section) => render(section.id))}</aside>;
}

function HomeView() {
  const { data = DEFAULT_PUBLIC_SITE_CONFIG } = usePublicSiteConfig();
  const config = data ?? DEFAULT_PUBLIC_SITE_CONFIG;
  const heroVisible = config.sections.find((section) => section.id === "hero")?.visible ?? true;
  return <div className="bg-background">{heroVisible ? <Hero config={config}/> : null}<div className={`${CONTAINER} flex flex-col gap-3 lg:flex-row lg:items-start`}><main className="min-w-0 flex-1"><MainContent config={config}/></main><Rail config={config}/></div></div>;
}

function PricingView() { const { data: tiers = [] } = usePublicTiers(); return <section className={`${CONTAINER} py-10 sm:py-12`}><div className="mb-6 max-w-2xl"><p className="text-[10px] font-bold tracking-[0.22em] text-primary">PRICING</p><h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight text-navy-deep sm:text-4xl">Simple pricing for property operations.</h1><p className="mt-1 text-sm leading-6 text-muted-foreground">Published rates in Kenyan shillings, with custom options for larger portfolios.</p></div><PublicPricing tiers={tiers}/></section>; }

export function PublicLandingPage() { const { pathname } = useLocation(); const isPricing = pathname === PUBLIC_ROUTES.pricing; return <PublicShell>{isPricing ? <PricingView/> : <HomeView/>}</PublicShell>; }
export default PublicLandingPage;
