import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  /** Tailwind classes for the icon's circular background, e.g. "bg-emerald-500/10" */
  iconBgClass: string;
  /** Tailwind classes for the icon color, e.g. "text-emerald-500" */
  iconColorClass: string;
  label: string;
  value: React.ReactNode;
}

/**
 * Small metric card (icon + label + value) used throughout billing,
 * payments, and dashboard screens. Extracted from several near-identical
 * copies that had accumulated across ManagerPlatformBilling.tsx and others.
 */
export function StatCard({ icon: Icon, iconBgClass, iconColorClass, label, value }: StatCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-full ${iconBgClass} flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${iconColorClass}`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
