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
        success:     "border-success/40 bg-success/10 text-success font-semibold",
        warning:     "border-warning/40 bg-warning/10 text-warning font-semibold",
        danger:      "border-destructive/40 bg-destructive/10 text-destructive font-semibold",
        info:        "border-info/40 bg-info/10 text-info font-semibold",
        indigo:      "border-info/40 bg-info/10 text-info font-medium",
        purple:      "border-purple/40 bg-purple/10 text-purple font-semibold",
        teal:        "border-teal/40 bg-teal/10 text-teal font-semibold",
        gold:        "border-gold/40 bg-gold/10 text-gold font-semibold",
        slate:       "border-border bg-secondary-background text-secondary-foreground font-medium",
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
