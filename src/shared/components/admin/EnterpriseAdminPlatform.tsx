import React, { useState } from "react";
import {
  LayoutDashboard, Building2, ShieldCheck, Sliders, CreditCard,
  ShieldAlert, Activity, Webhook, Settings, LifeBuoy, Search, Sparkles, Smartphone, Globe,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
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
import PlatformAdminManagement from "@/features/webhost/components/PlatformAdminManagement";
import { Crown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const tabCls =
  "gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground";

export function EnterpriseAdminPlatform({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [globalSearch, setGlobalSearch] = useState("");

  return (
    <div className={cn("space-y-4", className)}>
      {/* Enterprise Administration Header & Global Search */}
      <div className="enterprise-card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="section-title tracking-tight">CALQULUS Enterprise Admin Console</h2>
            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
              Platform Layer
            </Badge>
          </div>
          <p className="supporting-text mt-1">
            Cross-tenant administration, role-based access control, telemetry, security audit, and commercial licensing.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-secondary-foreground" />
            <Input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Global admin search (orgs, users, logs)..."
              className="pl-8 text-xs h-8 bg-card"
            />
          </div>
        </div>
      </div>

      {/* Main Workspace Tabs — grouped into enterprise control-plane sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="border-b pb-2 overflow-x-auto">
          <TabsList className="flex h-auto gap-1 bg-transparent p-0">
            {/* A. Platform Health */}
            <TabsTrigger value="overview" className={tabCls}>
              <LayoutDashboard className="h-3.5 w-3.5" /> Platform Health
            </TabsTrigger>
            <TabsTrigger value="monitoring" className={tabCls}>
              <Activity className="h-3.5 w-3.5" /> Telemetry &amp; Health
            </TabsTrigger>
            {/* B. Organizations */}
            <TabsTrigger value="tenants" className={tabCls}>
              <Building2 className="h-3.5 w-3.5" /> Organizations &amp; Tenants
            </TabsTrigger>
            {/* C. Security & Audit */}
            <TabsTrigger value="security" className={tabCls}>
              <ShieldAlert className="h-3.5 w-3.5" /> Security &amp; Audit
            </TabsTrigger>
            {/* D. RBAC / Permissions */}
            <TabsTrigger value="rbac" className={tabCls}>
              <ShieldCheck className="h-3.5 w-3.5" /> RBAC &amp; Permissions
            </TabsTrigger>
            <TabsTrigger value="flags" className={tabCls}>
              <Sliders className="h-3.5 w-3.5" /> Feature Flags
            </TabsTrigger>
            {/* E. Commercial / Licensing */}
            <TabsTrigger value="licenses" className={tabCls}>
              <CreditCard className="h-3.5 w-3.5" /> Licenses &amp; Billing
            </TabsTrigger>
            {/* F. Infrastructure / Integrations */}
            <TabsTrigger value="integrations" className={tabCls}>
              <Webhook className="h-3.5 w-3.5" /> Integrations &amp; APIs
            </TabsTrigger>
            {/* G. Configuration */}
            <TabsTrigger value="config" className={tabCls}>
              <Settings className="h-3.5 w-3.5" /> Configuration
            </TabsTrigger>
            {/* Extended platform modules (preserved) */}
            <TabsTrigger value="platform-admins" className="gap-1.5 text-xs font-bold py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Crown className="h-3.5 w-3.5 text-warning" /> Platform Admins
            </TabsTrigger>
            <TabsTrigger value="branding" className={tabCls}>
              <Sparkles className="h-3.5 w-3.5" /> Branding &amp; Theme
            </TabsTrigger>
            <TabsTrigger value="support" className={tabCls}>
              <LifeBuoy className="h-3.5 w-3.5" /> Support Ops
            </TabsTrigger>
            <TabsTrigger value="commercial-launch" className={tabCls}>
              <Sparkles className="h-3.5 w-3.5 text-success" /> Commercial Launch
            </TabsTrigger>
            <TabsTrigger value="property-os" className={tabCls}>
              <Sparkles className="h-3.5 w-3.5 text-warning" /> Property OS
            </TabsTrigger>
            <TabsTrigger value="proptech-ecosystem" className={tabCls}>
              <Globe className="h-3.5 w-3.5 text-success" /> PropTech Ecosystem
            </TabsTrigger>
            <TabsTrigger value="ai-copilot" className={tabCls}>
              <Sparkles className="h-3.5 w-3.5 text-warning" /> AI Copilot
            </TabsTrigger>
            <TabsTrigger value="native-mobile" className={tabCls}>
              <Smartphone className="h-3.5 w-3.5 text-success" /> Native Mobile
            </TabsTrigger>
            <TabsTrigger value="ops-excellence" className={tabCls}>
              <Activity className="h-3.5 w-3.5 text-primary" /> Ops Excellence
            </TabsTrigger>
          </TabsList>
        </div>

        {/* A. Platform Health — real connectivity + edge reachability + org + audit snapshot */}
        <TabsContent value="overview" className="m-0 space-y-4">
          <SystemHealthMonitoring />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MultiTenantManager />
            <SecurityAuditCenter />
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="m-0">
          <SystemHealthMonitoring />
        </TabsContent>

        {/* B. Organizations */}
        <TabsContent value="tenants" className="m-0">
          <MultiTenantManager />
        </TabsContent>

        {/* C. Security & Audit — real activity_logs via useAuditLogs */}
        <TabsContent value="security" className="m-0">
          <SecurityAuditCenter />
        </TabsContent>

        {/* D. RBAC / Permissions */}
        <TabsContent value="rbac" className="m-0">
          <VisualRbacEditor />
        </TabsContent>

        <TabsContent value="flags" className="m-0">
          <FeatureFlagCenter />
        </TabsContent>

        {/* E. Commercial / Licensing */}
        <TabsContent value="licenses" className="m-0">
          <LicenseSubscriptionCenter />
        </TabsContent>

        {/* F. Infrastructure / Integrations */}
        <TabsContent value="integrations" className="m-0">
          <IntegrationCenter />
        </TabsContent>

        {/* G. Configuration */}
        <TabsContent value="config" className="m-0">
          <AdminConfigurationCenter />
        </TabsContent>

        {/* Extended platform modules (preserved — no functionality removed) */}
        <TabsContent value="platform-admins" className="m-0">
          <PlatformAdminManagement />
        </TabsContent>

        <TabsContent value="branding" className="m-0">
          <MultiBrandStudio />
        </TabsContent>

        <TabsContent value="support" className="m-0">
          <SupportOperationsCenter />
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

        <TabsContent value="ai-copilot" className="m-0">
          <AiCopilotHub />
        </TabsContent>

        <TabsContent value="native-mobile" className="m-0">
          <NativeAppSuite />
        </TabsContent>

        <TabsContent value="ops-excellence" className="m-0">
          <OperationalExcellenceHub />
        </TabsContent>
      </Tabs>
    </div>
  );
}
