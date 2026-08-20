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
      {!imageSrc ? (
        <div className="absolute inset-x-6 bottom-0 flex h-[72%] items-end justify-end gap-1.5 opacity-25">
          <span className="h-[48%] w-7 rounded-sm bg-white" />
          <span className="h-[70%] w-9 rounded-sm bg-white" />
          <span className="h-[58%] w-6 rounded-sm bg-white" />
          <span className="h-[86%] w-10 rounded-sm bg-white" />
          <span className="h-[40%] w-5 rounded-sm bg-white" />
        </div>
      ) : null}
    </div>
  );
}
