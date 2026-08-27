export interface SectionHeadingProps {
  id?: string;
  eyebrow?: string;
  title: string;
  sub?: string;
  center?: boolean;
  /** Heading level. Defaults to h2; use "h1" as the page's main heading when no other h1 exists. */
  level?: 1 | 2;
}

/**
 * Compact centered/left landing section heading — eyebrow + title + optional
 * supporting line. Data-driven (all copy flows from config).
 */
export function SectionHeading({ id, eyebrow, title, sub, center = true, level = 2 }: SectionHeadingProps) {
  const align = center ? "text-center" : "text-left";
  const Tag = level === 1 ? "h1" : "h2";
  return (
    <div id={id} className={`scroll-mt-24 ${align} ${center ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>
      {eyebrow ? <p className="landing-eyebrow">{eyebrow}</p> : null}
      <Tag className="landing-section-title mt-2">{title}</Tag>
      {sub ? (
        <p className="mt-2 text-[15px] leading-relaxed text-landing-textsecondary sm:text-base">{sub}</p>
      ) : null}
    </div>
  );
}