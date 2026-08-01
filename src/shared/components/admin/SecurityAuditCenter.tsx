import React, { useState } from "react";
import { ShieldAlert, Lock, AlertTriangle, Key, Search, Filter, CheckCircle2, User, Globe, History, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";

export interface AuditLogRecord {
  id: string;
  actorEmail: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: "success" | "failure" | "flagged";
  timestamp: string;
}

const SAMPLE_AUDIT_LOGS: AuditLogRecord[] = [
  { id: "audit-01", actorEmail: "mugo.james27@gmail.com", action: "PERMISSION_OVERRIDE_SAVED", resource: "Visual RBAC Matrix", ipAddress: "102.217.64.12", status: "success", timestamp: "10 mins ago" },
  { id: "audit-02", actorEmail: "jimmythemugo@gmail.com", action: "WATER_BILLING_RATE_UPDATE", resource: "Sunset Towers", ipAddress: "197.232.18.42", status: "success", timestamp: "42 mins ago" },
  { id: "audit-03", actorEmail: "unknown_user@197.232.99.1", action: "FAILED_ADMIN_LOGIN", resource: "/webhost/login", ipAddress: "197.232.99.1", status: "flagged", timestamp: "2 hours ago" },
  { id: "audit-04", actorEmail: "themugo@calqulusrms.com", action: "FEATURE_FLAG_TOGGLED", resource: "enable_mpesa_stk_v2", ipAddress: "102.217.64.12", status: "success", timestamp: "5 hours ago" },
];

export function SecurityAuditCenter({ className }: { className?: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = SAMPLE_AUDIT_LOGS.filter((log) => {
    const matchesSearch = log.actorEmail.toLowerCase().includes(searchTerm.toLowerCase()) || log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Card className={cn("border-border/80 bg-card shadow-sm", className)}>
      <CardHeader className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold text-foreground">Security Center & Audit Log Engine</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Immutably track system administrative events, authentication attempts, and threat alerts.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search audit logs..."
              className="pl-8 text-xs h-8"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All" className="text-xs">All Event Statuses</SelectItem>
              <SelectItem value="success" className="text-xs">Success</SelectItem>
              <SelectItem value="flagged" className="text-xs">Flagged Threats</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Security Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20 text-xs space-y-1">
            <span className="text-muted-foreground block text-[10px] font-bold uppercase">MFA Adoption Rate</span>
            <strong className="text-emerald-600 text-base">98.4%</strong>
            <span className="text-[10px] text-muted-foreground block">Required for all webhost admins</span>
          </div>

          <div className="p-3 rounded-lg border bg-amber-500/5 border-amber-500/20 text-xs space-y-1">
            <span className="text-muted-foreground block text-[10px] font-bold uppercase">Active Threats Blocked</span>
            <strong className="text-amber-600 text-base">3 Flagged</strong>
            <span className="text-[10px] text-muted-foreground block">Rate limit IP restrictions active</span>
          </div>

          <div className="p-3 rounded-lg border bg-primary/5 border-primary/20 text-xs space-y-1">
            <span className="text-muted-foreground block text-[10px] font-bold uppercase">Session Timeouts</span>
            <strong className="text-primary text-base">15 Mins Idle</strong>
            <span className="text-[10px] text-muted-foreground block">Strict JWT token rotation enabled</span>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="border border-border/80 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border/80 text-[11px] font-bold text-muted-foreground uppercase">
              <tr>
                <th className="p-3">Actor Email</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">Resource Target</th>
                <th className="p-3">IP Address</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-bold text-foreground">{log.actorEmail}</td>
                  <td className="p-3 font-mono text-[11px]">{log.action}</td>
                  <td className="p-3 text-muted-foreground">{log.resource}</td>
                  <td className="p-3 font-mono text-[11px] text-muted-foreground">{log.ipAddress}</td>
                  <td className="p-3 text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-bold h-4 uppercase",
                        log.status === "success" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                        log.status === "flagged" && "bg-red-500/10 text-red-600 border-red-500/20"
                      )}
                    >
                      {log.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-right text-muted-foreground text-[11px]">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
