/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 shadow-sm shadow-amber-400/20",
        secondary:   "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline:     "text-foreground border-border",
        success:     "border-transparent bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
        warning:     "border-transparent bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
        info:        "border-transparent bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
        gold:        "border-amber-400/30 bg-amber-400/12 text-amber-700 dark:text-amber-400",
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
