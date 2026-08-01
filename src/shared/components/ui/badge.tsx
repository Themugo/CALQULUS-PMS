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
        destructive: "border-transparent bg-destructive/15 text-destructive border-destructive/30",
        outline:     "text-foreground border-border bg-background",
        success:     "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium",
        warning:     "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400 font-medium",
        info:        "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400 font-medium",
        indigo:      "border-[#304FFE]/20 bg-[#304FFE]/10 text-[#304FFE] dark:text-indigo-400 font-medium",
        slate:       "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300 font-medium",
        gold:        "border-primary/20 bg-primary/10 text-primary font-medium",
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
