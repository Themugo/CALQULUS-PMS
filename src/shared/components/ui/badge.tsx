/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary:   "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
        outline:     "text-foreground border-border bg-background",
        success:     "border-[hsl(142_69%_66%)] bg-[hsl(145_81%_96%)] text-[hsl(142_72%_29%)] font-semibold",
        warning:     "border-[hsl(38_92%_60%)] bg-[hsl(41_100%_95%)] text-[hsl(33_100%_38%)] font-semibold",
        danger:      "border-[hsl(0_72%_64%)] bg-[hsl(0_86%_97%)] text-[hsl(0_73%_42%)] font-semibold",
        info:        "border-[hsl(243_75%_70%)] bg-[hsl(226_100%_97%)] text-[hsl(243_75%_45%)] font-semibold",
        indigo:      "border-[hsl(243_75%_70%)] bg-[hsl(226_100%_97%)] text-[hsl(243_75%_45%)] font-medium",
        slate:       "border-border bg-secondary-background text-secondary-foreground font-medium",
        gold:        "border-primary/30 bg-primary/10 text-primary font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
