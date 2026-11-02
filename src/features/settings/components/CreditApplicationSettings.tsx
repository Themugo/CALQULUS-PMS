import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PiggyBank } from "lucide-react";

type Mode = "manual" | "auto";
const OWNER_ROLES = ["manager", "landlord", "agency"];

/**
 * Lets a manager / landlord / agency choose whether tenant advance credit is
 * applied to new invoices automatically or only when they apply it themselves.
 */
export const CreditApplicationSettings = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("manual");
  const [saving, setSaving] = useState(false);
  const allowed = !!userRole && OWNER_ROLES.includes(userRole.role);

  useEffect(() => {
    if (!user?.id || !allowed) return;
    let cancelled = false;
    supabase
      .from("manager_credit_settings")
      .select("apply_mode")
      .eq("manager_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.apply_mode === "auto") setMode("auto");
      });
    return () => { cancelled = true; };
  }, [user?.id, allowed]);

  if (!allowed || !user?.id) return null;

  const choose = async (next: Mode) => {
    const previous = mode;
    setMode(next);
    setSaving(true);
    const { error } = await supabase
      .from("manager_credit_settings")
      .upsert({ manager_id: user.id, apply_mode: next }, { onConflict: "manager_id" });
    setSaving(false);
    if (error) {
      setMode(previous);
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Credit setting saved",
      description: next === "auto"
        ? "Advance credit will be applied to new invoices automatically."
        : "Advance credit will wait until you apply it.",
    });
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading">
          <PiggyBank className="h-5 w-5 text-primary" />
          Tenant credit
        </CardTitle>
        <CardDescription>
          When a tenant overpays, the extra is kept as credit. Choose how it is used on future invoices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={mode} onValueChange={(v) => choose(v as Mode)} disabled={saving} className="space-y-3">
          <div className="flex items-start gap-3">
            <RadioGroupItem value="auto" id="credit-auto" className="mt-1" />
            <Label htmlFor="credit-auto" className="cursor-pointer">
              <span className="font-medium">Apply automatically</span>
              <span className="block text-sm text-muted-foreground">
                New invoices are reduced by the tenant's credit as soon as they are created.
              </span>
            </Label>
          </div>
          <div className="flex items-start gap-3">
            <RadioGroupItem value="manual" id="credit-manual" className="mt-1" />
            <Label htmlFor="credit-manual" className="cursor-pointer">
              <span className="font-medium">Apply manually</span>
              <span className="block text-sm text-muted-foreground">
                Credit stays on the tenant's account until you apply it or recall it.
              </span>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
