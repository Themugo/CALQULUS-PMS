import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({
  label = "Loading data...",
  size = "md",
  className,
  ...props
}: LoadingStateProps) {
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={cn(
        "flex min-h-[180px] flex-col items-center justify-center p-6 text-center text-muted-foreground",
        className
      )}
      {...props}
    >
      <Loader2 className={cn("animate-spin text-primary mb-3", iconSizes[size])} />
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
    </div>
  );
}
