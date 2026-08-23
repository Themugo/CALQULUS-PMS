import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/hooks/use-toast";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Check, Loader2, ArrowLeft, ArrowRight, SkipForward, Users, Building2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { AGENCY_ONBOARDING_STEPS } from "@/features/onboarding/components/agency/AgencyOnboardingSteps";
import { Skeleton } from "@/shared/components/ui/skeleton";

const ORDER = AGENCY_ONBOARDING_STEPS.map((s) => s.id) as readonly string[];

interface AgencyFacts {
  agencyName: string | null;
  propertyCount: number;
  clientCount: number;
}

async function fetchAgencyFacts(userId: string): Promise<AgencyFacts> {
  const [company, properties, links] = await Promise.all([
    supabase.from("company_settings").select("company_name").eq("manager_user_id", userId).maybeSingle(),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("manager_id", userId),
    supabase.from("property_landlords").select("landlord_user_id", { count: "exact", head: true }).eq("manager_id", userId).not("landlord_user_id", "is", null),
  ]);
  return {
    agencyName: company.data?.company_name ?? null,
    propertyCount: properties.count ?? 0,
    clientCount: links.count ?? 0,
  };
}

export default function AgencyOnboardingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [stepIdx, setStepIdx] = useState(0);
  const [agencyName, setAgencyName] = useState("");
  const [clientName, setClientName] = useState("");
  const [teamEmail, setTeamEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const userId = user?.id ?? null;

  const { data: facts, isLoading, error } = useQuery<AgencyFacts>({
    queryKey: ["agency-onboarding-facts", userId],
    queryFn: () => fetchAgencyFacts(userId!),
    enabled: !!userId,
  });

  const completedIds = useMemo(() => {
    if (!facts) return new Set<string>();
    const ids = new Set<string>();
    if (facts.agencyName) ids.add("profile");
    if (facts.clientCount > 0) ids.add("clients");
    if (facts.propertyCount > 0) ids.add("property");
    return ids;
  }, [facts]);

  const currentId = ORDER[Math.min(stepIdx, ORDER.length - 1)];

  const skipStep = () => setStepIdx((i) => Math.min(i + 1, ORDER.length - 1));

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("company_settings").upsert(
        {
          manager_user_id: userId,
          company_name: agencyName || "My agency",
        },
        { onConflict: "manager_user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Agency profile saved." });
      skipStep();
    },
    onError: (error) => {
      toast({ title: "Could not save profile", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    },
  });

  const saveClient = useMutation({
    mutationFn: async () => {
      // The clients tab uses property_landlords; create a placeholder
      // landlord record linked to the first property if none exists. Real
      // clients are added per-property from the Clients tab.
      if (!clientName.trim()) return;
      const { data: property } = await supabase
        .from("properties")
        .select("id")
        .eq("manager_id", userId!)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!property) {
        // No properties yet — the landlord flow will follow after first
        // property is added. Save the client name as a draft note.
        const { error } = await supabase.from("company_settings").upsert(
          {
            manager_user_id: userId,
            company_name: agencyName || "My agency",
            brand_config: { onboarding: { firstClientName: clientName } },
          },
          { onConflict: "manager_user_id" },
        );
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("company_settings").upsert(
        {
          manager_user_id: userId,
          company_name: agencyName || "My agency",
          brand_config: { onboarding: { firstClientName: clientName } },
        },
        { onConflict: "manager_user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Client note saved — link the property owner when you add your first property." });
      skipStep();
    },
    onError: (error) => {
      toast({ title: "Could not save client", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    },
  });

  const inviteTeam = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password: crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "Aa1!",
        options: {
          emailRedirectTo: `${window.location.origin}/agency`,
          data: { full_name: email.split("@")[0], role: "submanager", manager_id: userId },
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTeamEmail("");
      toast({ title: "Invite sent", description: "The teammate will get an email with the invitation link." });
      skipStep();
    },
    onError: (error) => {
      toast({ title: "Could not invite team member", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    },
  });

  if (!userId) {
    return (
      <Layout title="Setting up your agency" subtitle="Professional portfolio management.">
        <div className="p-6">
          <p className="text-sm text-muted-foreground">Loading your account…</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout title="Setting up your agency" subtitle="Professional portfolio management.">
        <div className="space-y-4 p-6">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-8 rounded-md w-2/3" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Setting up your agency" subtitle="Professional portfolio management.">
        <div className="p-6">
          <p className="text-sm text-destructive">Could not load your agency state. Try again.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Setting up your agency" subtitle="Professional portfolio management.">
      <div className="space-y-6 p-6">
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {AGENCY_ONBOARDING_STEPS.map((step, i) => {
            const done = i < stepIdx || completedIds.has(step.id);
            const active = i === stepIdx;
            return (
              <li key={step.id} className="flex-1">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2.5",
                    done && "border-success/40 bg-success/10",
                    active && "border-primary/60 bg-primary/8",
                    !done && !active && "border-border",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">{step.label}</p>
                    <p className="text-[11px] text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-muted-foreground sm:hidden">
          Step {Math.min(stepIdx + 1, ORDER.length)} of {ORDER.length} · {AGENCY_ONBOARDING_STEPS[Math.min(stepIdx, ORDER.length - 1)].label}
        </p>

        {currentId === "account" ? (
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-semibold">Your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your login is ready. Continue to set up your agency profile.</p>
            <div className="mt-5 flex gap-2">
              <Button onClick={skipStep} className="gap-1.5">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        ) : null}

        {currentId === "verification" ? (
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-semibold">Verify your email</h2>
            <p className="mt-1 text-sm text-muted-foreground">Check your inbox for a verification link.</p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" onClick={skipStep} className="gap-1.5">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={skipStep} className="gap-1.5">
                <SkipForward className="h-4 w-4" /> Skip for now
              </Button>
            </div>
          </section>
        ) : null}

        {currentId === "profile" ? (
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-semibold">Agency profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">The name your clients and owners see on statements.</p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!agencyName.trim()) return;
                setIsSaving(true);
                void saveProfile.mutateAsync().finally(() => setIsSaving(false));
              }}
            >
              <div>
                <Label htmlFor="agency-name">Agency name</Label>
                <Input
                  id="agency-name"
                  className="mt-1.5"
                  placeholder="Summit Property Management"
                  value={agencyName}
                  onChange={(event) => setAgencyName(event.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving || !agencyName.trim()}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save and continue
                </Button>
                <Button type="button" variant="outline" onClick={skipStep}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                </Button>
              </div>
            </form>
          </section>
        ) : null}

        {currentId === "clients" ? (
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-semibold">First client</h2>
            <p className="mt-1 text-sm text-muted-foreground">Link the first property owner you manage for. You can also add more later.</p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!clientName.trim()) return;
                setIsSaving(true);
                void saveClient.mutateAsync().finally(() => setIsSaving(false));
              }}
            >
              <div>
                <Label htmlFor="client-name">Client or owner name</Label>
                <Input
                  id="client-name"
                  className="mt-1.5"
                  placeholder="James Kamau"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">Link their properties from the Clients tab when they're ready.</p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving || !clientName.trim()}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  <Users className="mr-1.5 h-4 w-4" /> Save and continue
                </Button>
                <Button type="button" variant="outline" onClick={skipStep}>
                  <SkipForward className="mr-1.5 h-4 w-4" /> Skip for now
                </Button>
              </div>
            </form>
          </section>
        ) : null}

        {currentId === "property" ? (
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-semibold">First property</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add the first managed building. More can follow later.</p>
            <div className="mt-5 flex gap-2">
              <Button onClick={() => navigate("/agency/properties")} className="gap-1.5">
                <Building2 className="mr-1.5 h-4 w-4" /> Add a property <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={skipStep}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Button>
            </div>
          </section>
        ) : null}

        {currentId === "team" ? (
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-semibold">Invite your team</h2>
            <p className="mt-1 text-sm text-muted-foreground">Colleagues can manage properties and clients. Optional.</p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!teamEmail.trim()) return;
                setIsSaving(true);
                void inviteTeam.mutateAsync(teamEmail.trim()).finally(() => setIsSaving(false));
              }}
            >
              <div>
                <Label htmlFor="team-email">Teammate email</Label>
                <Input
                  id="team-email"
                  type="email"
                  className="mt-1.5"
                  placeholder="colleague@agency.com"
                  value={teamEmail}
                  onChange={(event) => setTeamEmail(event.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving || !teamEmail.trim()}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  <Users className="mr-1.5 h-4 w-4" /> Send invite
                </Button>
                <Button type="button" variant="outline" onClick={skipStep}>
                  <SkipForward className="mr-1.5 h-4 w-4" /> Skip for now
                </Button>
              </div>
            </form>
          </section>
        ) : null}

        {currentId === "complete" ? (
          <section className="rounded-xl border border-border bg-card p-6 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="mt-3 font-heading text-xl font-bold text-foreground">Your agency is ready.</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {facts && facts.propertyCount > 0 ? `${facts.propertyCount} propert${facts.propertyCount === 1 ? "y" : "ies"} managed. ` : ""}
              {facts && facts.clientCount > 0 ? `${facts.clientCount} client${facts.clientCount === 1 ? "" : "s"} linked. ` : ""}
              Next: add more clients and properties from your dashboard.
            </p>
            <Button className="mt-5" onClick={() => navigate("/agency")}>
              Go to Agency Dashboard
            </Button>
          </section>
        ) : null}
      </div>
    </Layout>
  );
}
