import React, { useState } from "react";
import {
  LayoutDashboard, Building2, ShieldCheck, Sliders, CreditCard,
  ShieldAlert, Activity, Webhook, Settings, LifeBuoy, Search, Bell, Sparkles, Smartphone, Globe
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";

import { MultiTenantManager } from "./MultiTenantManager";
import { VisualRbacEditor } from "./VisualRbacEditor";
import { FeatureFlagCenter } from "./FeatureFlagCenter";
import { LicenseSubscriptionCenter } from "./LicenseSubscriptionCenter";
import { SecurityAuditCenter } from "./SecurityAuditCenter";
import { SystemHealthMonitoring } from "./SystemHealthMonitoring";
import { IntegrationCenter } from "./IntegrationCenter";
import { AdminConfigurationCenter } from "./AdminConfigurationCenter";
import { SupportOperationsCenter } from "./SupportOperationsCenter";
import { MultiBrandStudio } from "@/shared/components/branding/MultiBrandStudio";
import { AiCopilotHub } from "@/shared/components/ai/AiCopilotHub";
import { NativeAppSuite } from "@/shared/components/mobile/NativeAppSuite";
import { OperationalExcellenceHub } from "@/shared/components/ops/OperationalExcellenceHub";
import { PropTechEcosystemHub } from "@/shared/components/ecosystem/PropTechEcosystemHub";
import { PropertyOsSuite } from "@/shared/components/propertyos/PropertyOsSuite";
import { CommercialLaunchSuite } from "@/shared/components/commercial/CommercialLaunchSuite";
import { cn } from "@/shared/lib/utils";

export function EnterpriseAdminPlatform({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [globalSearch, setGlobalSearch] = useState("");

  return (
    <div className={cn("space-y-4", className)}>
      {/* Top Enterprise Administration Header & Global Search Bar */}
      <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-foreground tracking-tight">CALQULUS Enterprise Admin Console</h2>
            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
              Platform Layer
            </Badge>
            <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border-amber-500/20">
              CONFIGURATION / LAB CONSOLE
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-tenant administration, visual RBAC control, telemetry, security audit, and feature flag management.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Global admin search (orgs, users, logs)..."
              className="pl-8 text-xs h-8 bg-background"
            />
          </div>
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="border-b pb-2 overflow-x-auto">
          <TabsList className="flex h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="overview" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LayoutDashboard className="h-3.5 w-3.5" /> Platform Health
            </TabsTrigger>
            <TabsTrigger value="commercial-launch" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Commercial Launch & Growth
            </TabsTrigger>
            <TabsTrigger value="property-os" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Property OS Ecosystem
            </TabsTrigger>
            <TabsTrigger value="proptech-ecosystem" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Globe className="h-3.5 w-3.5 text-emerald-400" /> Digital PropTech Ecosystem
            </TabsTrigger>
            <TabsTrigger value="tenants" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="h-3.5 w-3.5" /> Organizations & Tenants
            </TabsTrigger>
            <TabsTrigger value="rbac" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> RBAC & Permissions
            </TabsTrigger>
            <TabsTrigger value="flags" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sliders className="h-3.5 w-3.5" /> Feature Flags
            </TabsTrigger>
            <TabsTrigger value="licenses" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="h-3.5 w-3.5" /> Licenses & Billing
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShieldAlert className="h-3.5 w-3.5" /> Security & Audit
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Activity className="h-3.5 w-3.5" /> Telemetry & Health
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Webhook className="h-3.5 w-3.5" /> Integrations & APIs
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-3.5 w-3.5" /> Configuration
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Branding & Theme
            </TabsTrigger>
            <TabsTrigger value="ai-copilot" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> AI Copilot Operations
            </TabsTrigger>
            <TabsTrigger value="native-mobile" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Smartphone className="h-3.5 w-3.5 text-emerald-400" /> Native Mobile Suite
            </TabsTrigger>
            <TabsTrigger value="ops-excellence" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Activity className="h-3.5 w-3.5 text-blue-400" /> Ops Excellence Engine
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LifeBuoy className="h-3.5 w-3.5" /> Support Ops
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="m-0 space-y-4">
          <SystemHealthMonitoring />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MultiTenantManager />
            <SecurityAuditCenter />
          </div>
        </TabsContent>

        <TabsContent value="commercial-launch" className="m-0">
          <CommercialLaunchSuite />
        </TabsContent>

        <TabsContent value="property-os" className="m-0">
          <PropertyOsSuite />
        </TabsContent>

        <TabsContent value="proptech-ecosystem" className="m-0">
          <PropTechEcosystemHub />
        </TabsContent>

        <TabsContent value="tenants" className="m-0">
          <MultiTenantManager />
        </TabsContent>

        <TabsContent value="rbac" className="m-0">
          <VisualRbacEditor />
        </TabsContent>

        <TabsContent value="flags" className="m-0">
          <FeatureFlagCenter />
        </TabsContent>

        <TabsContent value="licenses" className="m-0">
          <LicenseSubscriptionCenter />
        </TabsContent>

        <TabsContent value="security" className="m-0">
          <SecurityAuditCenter />
        </TabsContent>

        <TabsContent value="monitoring" className="m-0">
          <SystemHealthMonitoring />
        </TabsContent>

        <TabsContent value="integrations" className="m-0">
          <IntegrationCenter />
        </TabsContent>

        <TabsContent value="config" className="m-0">
          <AdminConfigurationCenter />
        </TabsContent>

        <TabsContent value="branding" className="m-0">
          <MultiBrandStudio />
        </TabsContent>

        <TabsContent value="ai-copilot" className="m-0">
          <AiCopilotHub />
        </TabsContent>

        <TabsContent value="native-mobile" className="m-0">
          <NativeAppSuite />
        </TabsContent>

        <TabsContent value="ops-excellence" className="m-0">
          <OperationalExcellenceHub />
        </TabsContent>

        <TabsContent value="support" className="m-0">
          <SupportOperationsCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
}
