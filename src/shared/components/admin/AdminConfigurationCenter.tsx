import React, { useState } from "react";
import { Settings, Globe, Mail, FileText, Palette, Save, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { cn } from "@/shared/lib/utils";

export function AdminConfigurationCenter({ className }: { className?: string }) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className={cn("border-border/80 bg-card shadow-sm", className)}>
      <CardHeader className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold text-foreground">Global Platform Configuration Center</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Configure default currency, localization, automated email templates, and white-label branding parameters.
          </CardDescription>
        </div>

        <Button size="sm" onClick={handleSave} className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground">
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? "Saved Settings" : "Save Changes"}
        </Button>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        <Tabs defaultValue="localization">
          <TabsList className="mb-4">
            <TabsTrigger value="localization" className="text-xs font-bold gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Currency & Regional
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs font-bold gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email & SMS Templates
            </TabsTrigger>
            <TabsTrigger value="branding" className="text-xs font-bold gap-1.5">
              <Palette className="h-3.5 w-3.5" /> Branding Defaults
            </TabsTrigger>
          </TabsList>

          <TabsContent value="localization" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Primary Platform Currency</Label>
                <Input defaultValue="KES - Kenyan Shilling" className="h-8 text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Default Timezone</Label>
                <Input defaultValue="Africa/Nairobi (EAT, UTC+3)" className="h-8 text-xs" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Default Tenant Invitation Email Signature</Label>
              <textarea
                className="w-full h-20 p-2 text-xs border rounded-lg bg-background"
                defaultValue="Welcome to CALQULUS RMS. Please click below to complete setting up your online tenant account."
              />
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">System Application Title</Label>
                <Input defaultValue="CALQULUS RMS - Enterprise SaaS" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Support Email Footer</Label>
                <Input defaultValue="support@calqulusrms.com" className="h-8 text-xs" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
