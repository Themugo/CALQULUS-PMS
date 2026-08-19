import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Building2, Users, FileText, CreditCard, Wallet, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/utils";

interface ManagerQuickActionsProps {
  hasProperties: boolean;
}

const actions = [
  { label: "Properties", icon: Building2, href: "/properties", description: "Buildings and units" },
  { label: "Tenants", icon: Users, href: "/tenants", description: "Who lives where" },
  { label: "Leases", icon: FileText, href: "/leases", description: "Agreements and expiry" },
  { label: "Invoices", icon: CreditCard, href: "/billing", description: "Bill and collect" },
  { label: "Payments", icon: Wallet, href: "/payments", description: "Payment history" },
          { label: "Receipts", icon: Receipt, href: "/billing?tab=receipts", description: "Paid invoice receipts" },
];

export function ManagerQuickActions({ hasProperties: _hasProperties }: ManagerQuickActionsProps) {
  const navigate = useNavigate();

  return (
    <Card className="mb-4 sm:mb-6 enterprise-card">
      <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
        <CardTitle className="text-sm font-semibold text-foreground">
          Golden path
        </CardTitle>
        <p className="supporting-text">
          Property → unit → tenant → lease → invoice → payment → receipt
        </p>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.href)}
              className={cn(
                "group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border border-border",
                "bg-card transition-all duration-200 touch-manipulation",
                "hover:-translate-y-0.5 hover:shadow-sm hover:border-primary/30 hover:bg-primary/5",
                "active:scale-95"
              )}
            >
              <div
                className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center",
                  "bg-muted/60 border border-border transition-colors",
                  "group-hover:bg-primary/10 group-hover:border-primary/20"
                )}
              >
                <action.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary" />
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
