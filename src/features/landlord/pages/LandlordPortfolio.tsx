import { Link } from "react-router-dom";
import { Building2, Users } from "lucide-react";
import LandlordLayout from "@/features/landlord/components/LandlordLayout";
import { LandlordPayoutDialog } from "@/features/landlord/components/LandlordPayoutDialog";
import { useLandlordPortfolio } from "@/features/landlord/hooks/useLandlordPortfolio";
import { formatKes, occupancyBarClass } from "@/features/landlord/lib/formatKes";
import { landlordPropertyPath } from "@/features/landlord/lib/landlordPaths";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { ErrorState } from "@/shared/components/ui/error-state";
import { occupancyRateColor } from "@/shared/lib/statusBadge";

export default function LandlordPortfolio() {
  const { portfolio, properties, isLoading, isError, refetch } = useLandlordPortfolio();

  return (
    <LandlordLayout
      title="Portfolio"
      description="Occupancy, income, and your share per property. Tenant personal information is not shown here."
    >
      {isError ? <ErrorState title="Couldn't load portfolio" onRetry={() => void refetch()} className="mb-6" /> : null}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}</div>
      ) : properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties linked yet"
          description={`Ask your manager to link buildings to ${portfolio.totalProperties === 0 ? "this account" : "you"}.`}
        />
      ) : (
        <div className="space-y-4">
          {properties.map((prop) => {
            const occ = prop.units > 0 ? Math.round((prop.occupied / prop.units) * 100) : 0;
            return (
              <Card key={prop.id} className="border-border">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold">{prop.name}</h2>
                        <Badge variant="outline" className="text-xs">
                          {prop.revenue_share_pct}% share
                        </Badge>
                      </div>
                      <p className="mb-3 text-sm text-muted-foreground">{prop.address}</p>
                      <div className="mb-3">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-3 w-3" /> Occupancy
                          </span>
                          <span className={`font-semibold ${occupancyRateColor(occ)}`}>
                            {occ}% ({prop.occupied} of {prop.units})
                          </span>
                        </div>
                        <Progress value={occ} className="h-2.5 bg-muted" indicatorClassName={occupancyBarClass(occ)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Billed</p>
                          <p className="text-sm font-medium">{formatKes(prop.expectedRent)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Monthly income</p>
                          <p className="text-sm font-medium">{formatKes(prop.collectedRent)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Outstanding</p>
                          <p className={`text-sm font-medium ${prop.outstandingArrears > 0 ? "text-destructive" : ""}`}>
                            {formatKes(prop.outstandingArrears)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net to you</p>
                          <p className="text-sm font-semibold text-success">
                            {formatKes((prop.collectedRent * prop.revenue_share_pct) / 100)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 lg:w-44">
                      {prop.manager_name ? (
                        <p className="rounded-lg border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                          <span className="block font-semibold text-foreground">{prop.manager_name}</span>
                          Property manager
                        </p>
                      ) : null}
                      <Button asChild className="btn-brand">
                        <Link to={landlordPropertyPath(prop.id)}>View property</Link>
                      </Button>
                      <LandlordPayoutDialog properties={[prop]} defaultPropertyId={prop.id} triggerLabel="Request payout" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </LandlordLayout>
  );
}
