import { cn } from "@/shared/lib/utils";

export type PropertyVisualSlot = "residential" | "commercial" | "office";

const SURFACES: Record<PropertyVisualSlot, string> = {
  residential: "public-arch-residential",
  commercial: "public-arch-commercial",
  office: "public-arch-office",
};

interface ArchitecturalSurfaceProps {
  slot: PropertyVisualSlot;
  className?: string;
  /** Future photograph. Leave unset in this phase — CSS architecture is the fallback. */
  imageSrc?: string;
}

/**
 * CSS architectural background with an optional image slot.
 * Do not pass remote/stock URLs in this homepage phase.
 */
export function ArchitecturalSurface({ slot, className, imageSrc }: ArchitecturalSurfaceProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} data-image-slot={slot} aria-hidden>
      {imageSrc ? (
        <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div
        className={cn(
          "absolute inset-0",
          imageSrc ? "bg-navy-deep/45" : SURFACES[slot],
        )}
      />
    </div>
  );
}
