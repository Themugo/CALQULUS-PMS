import * as React from "react";
import { cn } from "@/shared/lib/utils";

interface DataTableFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  minWidth?: string;
}

export function DataTableFrame({ className, children, minWidth = "min-w-[760px]", ...props }: DataTableFrameProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)} {...props}>
      <div className="w-full overflow-x-auto">
        <div className={minWidth}>{children}</div>
      </div>
    </div>
  );
}
