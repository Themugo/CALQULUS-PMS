import { landingIcon } from "@/features/marketing/landing/landingIcon";
import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import type { LandingPropertyType } from "@/features/marketing/landing/landingContent";

interface PropertyTypeStripProps {
  id?: string;
  eyebrow?: string;
  title: string;
  sub?: string;
  items: LandingPropertyType[];
}

/**
 * Property types — compact three-panel strip using the real bundled Kenyan
 * property photography. Icon + copy come from config.
 */
export function PropertyTypeStrip({
  id = "property-types",
  eyebrow = "Property types",
  title,
  sub,
  items,
}: PropertyTypeStripProps) {
  return (
    <section id={id} className="scroll-mt-24 bg-landing-surface py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          {eyebrow ? <p className="landing-eyebrow">{eyebrow}</p> : null}
          <h2 className="landing-section-title mt-2">{title}</h2>
          {sub ? (
            <p className="mt-2 text-[15px] leading-relaxed text-landing-textsecondary sm:text-base">{sub}</p>
          ) : null}
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {items.map((type) => {
            const Icon = landingIcon(type.icon);
            const image = PROPERTY_IMAGES[type.id];
            return (
              <li
                key={type.id}
                className="landing-card group overflow-hidden transition-shadow duration-200 motion-safe:hover:-translate-y-0.5"
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={image}
                    alt={`${type.name} property`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.045]"
                  />
                  <span
                    className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-landing-surface/95 text-landing-primary shadow-sm"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-heading text-[15px] font-semibold tracking-tight text-landing-textprimary">
                    {type.name}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-landing-textsecondary">{type.tagline}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}