import { ReactNode } from 'react';
import { useFeatureAccess, PlanFeature } from '@/shared/hooks/useFeatureAccess';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Lock } from 'lucide-react';
import { Skeleton } from '@/shared/components/ui/skeleton';

interface FeatureGateProps {
  feature: PlanFeature;
  featureLabel: string;
  children: ReactNode;
}

/**
 * Wraps a feature's UI, showing an upgrade prompt in place of `children`
 * when the manager's plan doesn't include it. See useFeatureAccess for why
 * this exists — it's available infrastructure, not yet applied anywhere;
 * wrap the specific pages you want gated with this deliberately.
 */
export function FeatureGate({ feature, featureLabel, children }: FeatureGateProps) {
  const { enabled, plan, isLoading } = useFeatureAccess(feature);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (enabled) return <>{children}</>;

  return (
    <Card className="border-amber-400/30 bg-amber-400/5">
      <CardContent className="p-6 text-center">
        <div className="h-10 w-10 rounded-full bg-amber-400/15 flex items-center justify-center mx-auto mb-3">
          <Lock className="h-5 w-5 text-amber-600" />
        </div>
        <p className="font-medium">{featureLabel} isn't on your current plan</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Your {plan} plan doesn't include this. Upgrade to unlock it.
        </p>
        <Button size="sm" variant="outline" asChild>
          <a href="/platform-billing">View plans</a>
        </Button>
      </CardContent>
    </Card>
  );
}
