import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Zap, UserPlus, FileText, Wrench, Building2, Droplets, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/utils";

interface ManagerQuickActionsProps {
  hasProperties: boolean;
}

const actions = [
  {
    label: "Add Property",
    icon: Building2,
    href: "/properties",
    description: "Register a new property",
    accent: "from-blue-500/20 to-blue-600/10 border-blue-500/20",
    iconColor: "text-blue-500",
    hoverBg: "hover:border-blue-500/40 hover:from-blue-500/25",
  },
  {
    label: "Add Tenant",
    icon: UserPlus,
    href: "/tenants",
    description: "Onboard a new tenant",
    accent: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20",
    iconColor: "text-emerald-500",
    hoverBg: "hover:border-emerald-500/40 hover:from-emerald-500/25",
  },
  {
    label: "Create Invoice",
    icon: FileText,
    href: "/billing",
    description: "Bill a tenant",
    accent: "from-amber-400/20 to-amber-500/10 border-amber-400/25",
    iconColor: "text-amber-500",
    hoverBg: "hover:border-amber-400/50 hover:from-amber-400/28",
  },
  {
    label: "Maintenance",
    icon: Wrench,
    href: "/maintenance",
    description: "Track repairs",
    accent: "from-violet-500/20 to-violet-600/10 border-violet-500/20",
    iconColor: "text-violet-500",
    hoverBg: "hover:border-violet-500/40 hover:from-violet-500/25",
  },
  {
    label: "Water Billing",
    icon: Droplets,
    href: "/water-billing",
    description: "Utility invoices",
    accent: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/20",
    iconColor: "text-cyan-500",
    hoverBg: "hover:border-cyan-500/40 hover:from-cyan-500/25",
  },
  {
    label: "Statements",
    icon: FileSpreadsheet,
    href: "/statements",
    description: "Monthly statements",
    accent: "from-rose-500/20 to-rose-600/10 border-rose-500/20",
    iconColor: "text-rose-500",
    hoverBg: "hover:border-rose-500/40 hover:from-rose-500/25",
  },
];

export function ManagerQuickActions({ hasProperties: _hasProperties }: ManagerQuickActionsProps) {
  const navigate = useNavigate();

  return (
    <Card className="mb-4 sm:mb-6">
      <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <div className="h-6 w-6 rounded-md bg-amber-400/15 border border-amber-400/25 flex items-center justify-center flex-shrink-0">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
          </div>
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.href)}
              className={cn(
                "group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border",
                "bg-gradient-to-br transition-all duration-200 touch-manipulation",
                "hover:-translate-y-0.5 hover:shadow-md active:scale-95",
                action.accent, action.hoverBg
              )}
            >
              <div className={cn(
                "h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center",
                "bg-background/80 shadow-sm transition-transform duration-200 group-hover:scale-110",
                "border border-border/60"
              )}>
                <action.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", action.iconColor)} />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground leading-tight">{action.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
