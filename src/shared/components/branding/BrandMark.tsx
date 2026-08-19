import calqulusLogo from "@/assets/calqulus-logo-new.jpg";
import { cn } from "@/shared/lib/utils";
import { CALQULUS_BRAND } from "@/shared/theme/tokens";

const MARK_SIZE = {
  xs: "h-5 w-5",
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
  nav: "h-8 w-8",
  hero: "h-14 w-auto",
} as const;

interface BrandMarkProps {
  size?: keyof typeof MARK_SIZE;
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
  imgClassName?: string;
}

/** Shared CALQULUS mark for login, header, sidebar, footer, and mobile chrome. */
export function BrandMark({
  size = "md",
  showWordmark = false,
  subtitle = "PMS",
  className,
  imgClassName,
}: BrandMarkProps) {
  const square = size !== "hero";
  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      <img
        src={calqulusLogo}
        alt={CALQULUS_BRAND.product}
        className={cn(
          MARK_SIZE[size],
          "object-cover flex-shrink-0",
          square && "rounded-lg ring-1 ring-border",
          !square && "object-contain",
          imgClassName,
        )}
      />
      {showWordmark && (
        <div className="min-w-0">
          <p className="font-heading font-bold text-sm tracking-tight text-foreground leading-none truncate">
            {CALQULUS_BRAND.name}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase mt-1 truncate">
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
