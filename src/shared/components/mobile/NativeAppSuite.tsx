import React, { useState } from "react";
import {
  Smartphone, User, Building, ShieldCheck, Wrench, Briefcase, TrendingUp, Sparkles, Wifi, QrCode, PenTool, CheckCircle2, DollarSign, Bell, MapPin, FileText, Download, ScanLine
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { OfflineHardwareBar } from "./OfflineHardwareBar";
import { NativeInspectionForm } from "./NativeInspectionForm";
import { DigitalSignaturePad } from "./DigitalSignaturePad";
import { cn } from "@/shared/lib/utils";

export function NativeAppSuite({ className }: { className?: string }) {
  const [activeApp, setActiveApp] = useState<"tenant" | "landlord" | "manager" | "maintenance" | "vendor" | "executive">("tenant");
  const [isPhoneFrame, setIsPhoneFrame] = useState(false);
  const [stkPaid, setStkPaid] = useState(false);

  const handleSimulateStkPush = () => {
    setStkPaid(true);
    setTimeout(() => setStkPaid(false), 3000);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Top Banner */}
      <div className="p-4 rounded-xl border bg-gradient-to-r from-emerald-500/15 via-primary/5 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" /> Native Mobile & Field Ops Experience Suite
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dedicated mobile PWA interfaces for Tenants, Landlords, Property Managers, Maintenance Technicians, Vendors, and Executives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isPhoneFrame ? "default" : "outline"}
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <Smartphone className="h-3.5 w-3.5" />
            {isPhoneFrame ? "Standard View" : "Device Mockup Frame"}
          </Button>
        </div>
      </div>

      {/* Global Device Hardware & Offline Status Bar */}
      <OfflineHardwareBar />

      {/* Mobile App Selector Tabs */}
      <Tabs value={activeApp} onValueChange={(v) => setActiveApp(v as any)} className="space-y-4">
        <TabsList className="h-9 p-1 bg-muted/40 border grid grid-cols-3 sm:grid-cols-6 w-full">
          <TabsTrigger value="tenant" className="text-xs font-bold gap-1">
            <User className="h-3.5 w-3.5 text-emerald-500" /> Tenant App
          </TabsTrigger>
          <TabsTrigger value="landlord" className="text-xs font-bold gap-1">
            <Building className="h-3.5 w-3.5 text-blue-500" /> Landlord App
          </TabsTrigger>
          <TabsTrigger value="manager" className="text-xs font-bold gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-500" /> Manager App
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="text-xs font-bold gap-1">
            <Wrench className="h-3.5 w-3.5 text-amber-500" /> Maintenance
          </TabsTrigger>
          <TabsTrigger value="vendor" className="text-xs font-bold gap-1">
            <Briefcase className="h-3.5 w-3.5 text-teal-500" /> Vendor App
          </TabsTrigger>
          <TabsTrigger value="executive" className="text-xs font-bold gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-indigo-500" /> Executive
          </TabsTrigger>
        </TabsList>

        <div className={cn(isPhoneFrame && "max-w-md mx-auto border-[8px] border-slate-900 rounded-[38px] p-2 bg-slate-950 shadow-2xl")}>
          {/* TENANT MOBILE APP */}
          <TabsContent value="tenant" className="m-0 space-y-4">
            <Card className="border-border/80 bg-card shadow-sm space-y-4 p-4 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    JM
                  </div>
                  <div>
                    <h4 className="font-extrabold text-foreground text-xs">James Makena</h4>
                    <p className="text-[10px] text-muted-foreground">Unit 3B • Kilimani Heights</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-bold">
                  LEASE ACTIVE
                </Badge>
              </div>

              {/* Balance & M-Pesa STK Payment */}
              <div className="p-4 rounded-xl bg-slate-950 text-white space-y-3">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                  <span>Current Rent Ledger Balance</span>
                  <span className="text-emerald-400">Due: 5th July</span>
                </div>
                <strong className="text-2xl font-black block text-white">KES 45,000.00</strong>

                <Button
                  onClick={handleSimulateStkPush}
                  className="w-full h-10 font-black text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 gap-2 shadow-md"
                >
                  <DollarSign className="h-4 w-4" />
                  {stkPaid ? "M-PESA STK SENT TO PHONE!" : "PAY RENT VIA M-PESA STK PUSH"}
                </Button>
              </div>

              {/* Digital Lease & Gate QR Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 border rounded-xl bg-card space-y-2">
                  <span className="font-bold text-foreground text-xs block">Gate Access Pass</span>
                  <div className="flex items-center gap-3">
                    <div className="p-2 border rounded-lg bg-white shrink-0">
                      <QrCode className="h-10 w-10 text-slate-900" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-foreground block">QR Key Active</span>
                      <p className="text-[10px] text-muted-foreground">Scan at gate barrier or intercom</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 border rounded-xl bg-card space-y-2">
                  <span className="font-bold text-foreground text-xs block">Digital Lease Signatures</span>
                  <p className="text-[10px] text-muted-foreground">Sign counter-signature via digital pad.</p>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold w-full gap-1">
                    <PenTool className="h-3 w-3 text-primary" /> View & Sign Lease
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* LANDLORD MOBILE APP */}
          <TabsContent value="landlord" className="m-0 space-y-4">
            <Card className="border-border/80 bg-card shadow-sm space-y-4 p-4 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h4 className="font-extrabold text-foreground text-xs">Landlord Revenue & Portfolio Mobile</h4>
                  <p className="text-[10px] text-muted-foreground">Guarded revenue performance & net payout sign-offs.</p>
                </div>
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[9px] font-bold">
                  REVENUE ONLY (NO TENANT PII)
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-xl bg-card">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Gross Collection</span>
                  <strong className="text-lg font-bold text-emerald-600">KES 1,240,000</strong>
                </div>
                <div className="p-3 border rounded-xl bg-card">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Net Payout Approved</span>
                  <strong className="text-lg font-bold text-foreground">KES 1,116,000</strong>
                </div>
              </div>

              {/* Digital Payout Approval Pad */}
              <DigitalSignaturePad signerName="Landlord Representative" signerRole="Owner" />
            </Card>
          </TabsContent>

          {/* MANAGER MOBILE APP */}
          <TabsContent value="manager" className="m-0 space-y-4">
            <NativeInspectionForm />
          </TabsContent>

          {/* MAINTENANCE APP */}
          <TabsContent value="maintenance" className="m-0 space-y-4">
            <Card className="border-border/80 bg-card shadow-sm p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h4 className="font-extrabold text-foreground text-xs">Field Technician Maintenance App</h4>
                  <p className="text-[10px] text-muted-foreground">Work order SLA tracking, before/after photos, and parts scan.</p>
                </div>
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] font-bold">
                  SLA Active (2h Left)
                </Badge>
              </div>

              <div className="p-3 border rounded-xl bg-amber-500/5 border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span>WO-882: Plumbing Leakage in Unit 12B</span>
                  <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600">HIGH PRIORITY</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">Water main pressure regulator replacement required.</p>
                <div className="pt-2 flex gap-2">
                  <Button size="sm" className="h-7 text-[10px] font-bold bg-primary text-primary-foreground gap-1">
                    <ScanLine className="h-3 w-3" /> Scan Replacement Part Barcode
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* VENDOR APP */}
          <TabsContent value="vendor" className="m-0 space-y-4">
            <Card className="border-border/80 bg-card shadow-sm p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h4 className="font-extrabold text-foreground text-xs">Vendor & Contractor Mobile Portal</h4>
                  <p className="text-[10px] text-muted-foreground">Submit work bids, invoice camera scan & site QR check-in.</p>
                </div>
                <Badge className="bg-teal-500/10 text-teal-600 border-teal-500/20 text-[9px] font-bold">
                  Verified Vendor
                </Badge>
              </div>

              <div className="p-3 border rounded-xl bg-card space-y-2">
                <span className="font-bold text-foreground text-xs block">Property QR Check-In</span>
                <p className="text-[11px] text-muted-foreground">Scan QR code at property entrance to log arrival timestamp on site.</p>
                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold gap-1">
                  <QrCode className="h-3 w-3 text-primary" /> Scan Property Barrier QR
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* EXECUTIVE APP */}
          <TabsContent value="executive" className="m-0 space-y-4">
            <Card className="border-border/80 bg-card shadow-sm p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h4 className="font-extrabold text-foreground text-xs">Executive Strategic Dashboard</h4>
                  <p className="text-[10px] text-muted-foreground">Real-time portfolio metrics, yield projections, and digital board sign-offs.</p>
                </div>
                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[9px] font-bold">
                  Executive Suite
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 border rounded-xl bg-card">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Portfolio Occupancy</span>
                  <strong className="text-lg font-bold text-emerald-600">94.2%</strong>
                </div>
                <div className="p-3 border rounded-xl bg-card">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Monthly Yield Rate</span>
                  <strong className="text-lg font-bold text-foreground">11.8% YTD</strong>
                </div>
                <div className="p-3 border rounded-xl bg-card">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Risk Score</span>
                  <strong className="text-lg font-bold text-emerald-600">Low (0.2%)</strong>
                </div>
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
