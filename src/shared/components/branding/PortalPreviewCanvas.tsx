import React, { useState } from "react";
import { Monitor, Smartphone, FileText, Building, Users, ShieldCheck, CheckCircle2, DollarSign, Download, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { cn } from "@/shared/lib/utils";

export function PortalPreviewCanvas({
  primaryColor = "#10b981",
  secondaryColor = "#065f46",
  companyName = "CALQULUS PROPERTY MANAGEMENT",
  className,
}: {
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
  className?: string;
}) {
  const [activePortal, setActivePortal] = useState<"tenant" | "landlord" | "login" | "pdf">("tenant");

  return (
    <Card className={cn("border-border/80 bg-card shadow-sm", className)}>
      <CardHeader className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold text-foreground">Multi-Portal Live Brand Canvas</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Preview how your custom theme, typography, and logos render live across tenant, landlord, and agency portals.
          </CardDescription>
        </div>

        <Tabs value={activePortal} onValueChange={(v) => setActivePortal(v as any)} className="w-full sm:w-auto">
          <TabsList className="h-8 text-xs p-1">
            <TabsTrigger value="tenant" className="text-xs font-bold px-2 py-0.5">Tenant Portal</TabsTrigger>
            <TabsTrigger value="landlord" className="text-xs font-bold px-2 py-0.5">Landlord Dashboard</TabsTrigger>
            <TabsTrigger value="login" className="text-xs font-bold px-2 py-0.5">Agency Login</TabsTrigger>
            <TabsTrigger value="pdf" className="text-xs font-bold px-2 py-0.5">PDF Receipt</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="p-4">
        {/* Render Live Dynamic Mock Canvas */}
        <div className="p-4 rounded-xl border bg-slate-950 text-slate-100 font-sans shadow-lg min-h-[300px]">
          {/* Tenant Portal View */}
          {activePortal === "tenant" && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: secondaryColor }}>
                <span className="font-extrabold text-sm text-white tracking-wide flex items-center gap-2">
                  <span className="h-6 w-6 rounded bg-white text-slate-900 flex items-center justify-center font-black text-xs">C</span>
                  {companyName}
                </span>
                <Badge className="bg-white/20 text-white border-none text-[10px]">TENANT PORTAL</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Rent Balance</span>
                  <strong className="text-xl font-extrabold text-white">KES 45,000</strong>
                  <div className="pt-2">
                    <button
                      className="w-full py-2 rounded font-bold text-xs text-slate-950 transition-all shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      PAY RENT NOW (M-PESA)
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Lease Info</span>
                  <span className="font-bold text-white block">Unit 3B • Kilimani Heights</span>
                  <span className="text-[11px] text-slate-400 block">Due Day: 5th of every month</span>
                </div>
              </div>
            </div>
          )}

          {/* Landlord Portal View */}
          {activePortal === "landlord" && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: secondaryColor }}>
                <span className="font-extrabold text-sm text-white tracking-wide flex items-center gap-2">
                  <Building className="h-4 w-4" /> {companyName} • LANDLORD PORTAL
                </span>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[10px]">REVENUE ONLY</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Monthly Gross Rent</span>
                  <strong className="text-lg font-bold text-emerald-400">KES 1,240,000</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Management Share</span>
                  <strong className="text-lg font-bold text-slate-200">10% (KES 124,000)</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Net Landlord Payout</span>
                  <strong className="text-lg font-bold text-white">KES 1,116,000</strong>
                </div>
              </div>
            </div>
          )}

          {/* Agency Login Page View */}
          {activePortal === "login" && (
            <div className="flex flex-col items-center justify-center py-6 space-y-4 max-w-sm mx-auto text-center">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-950 font-black text-lg" style={{ backgroundColor: primaryColor }}>
                C
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">{companyName}</h3>
                <p className="text-xs text-slate-400 mt-1">Sign in to your agency portal</p>
              </div>
              <div className="w-full space-y-2 text-left">
                <input
                  type="email"
                  defaultValue="agency.admin@calqulus.com"
                  readOnly
                  className="w-full h-8 px-3 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200"
                />
                <button
                  className="w-full py-2 rounded font-bold text-xs text-slate-950"
                  style={{ backgroundColor: primaryColor }}
                >
                  SIGN IN TO AGENCY PORTAL
                </button>
              </div>
            </div>
          )}

          {/* PDF Receipt View */}
          {activePortal === "pdf" && (
            <div className="bg-white text-slate-900 p-6 rounded-xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h4 className="font-extrabold text-sm" style={{ color: secondaryColor }}>{companyName}</h4>
                  <p className="text-[10px] text-slate-500">Official Rent Payment Receipt #REC-9812</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 border border-emerald-500 px-2 py-0.5 rounded-full uppercase">
                  PAID IN FULL
                </span>
              </div>

              <div className="flex justify-between text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 block">Received From:</span>
                  <span className="font-bold text-slate-800">James Makena (APT 3B)</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Amount Paid:</span>
                  <strong className="text-base font-extrabold" style={{ color: primaryColor }}>KES 45,000.00</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
