import React, { useState } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Building2, Users, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Calendar, Sparkles, Filter, ShieldCheck, Download
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { cn } from "@/shared/lib/utils";

const MOM_DATA = [
  { period: "Jan", Current: 480000, Previous: 420000, Forecast: 500000 },
  { period: "Feb", Current: 510000, Previous: 430000, Forecast: 530000 },
  { period: "Mar", Current: 550000, Previous: 460000, Forecast: 570000 },
  { period: "Apr", Current: 590000, Previous: 490000, Forecast: 610000 },
  { period: "May", Current: 640000, Previous: 520000, Forecast: 660000 },
  { period: "Jun", Current: 680000, Previous: 560000, Forecast: 700000 },
];

const OCCUPANCY_FORECAST = [
  { month: "Jul", Occupancy: 92, Target: 95 },
  { month: "Aug", Occupancy: 94, Target: 95 },
  { month: "Sep", Occupancy: 93, Target: 95 },
  { month: "Oct (FC)", Occupancy: 96, Target: 95 },
  { month: "Nov (FC)", Occupancy: 97, Target: 95 },
  { month: "Dec (FC)", Occupancy: 98, Target: 95 },
];

export function ExecutiveAnalyticsWorkspace() {
  const [comparisonMode, setComparisonMode] = useState("MoM");

  return (
    <div className="space-y-6">
      {/* Scorecards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Operating Revenue</span>
            <div className="h-8 w-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-foreground">KES 6,850,000</span>
            <Badge variant="outline" className="text-[10px] font-bold bg-success/10 text-success border-success/20 gap-0.5">
              <ArrowUpRight className="h-3 w-3" /> +14.2% {comparisonMode}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Vs KES 5,998,000 previous period</p>
        </Card>

        <Card className="p-4 border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Portfolio Occupancy Rate</span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-foreground">94.8%</span>
            <Badge variant="outline" className="text-[10px] font-bold bg-success/10 text-success border-success/20 gap-0.5">
              <ArrowUpRight className="h-3 w-3" /> +2.1% {comparisonMode}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">218 of 230 total units occupied</p>
        </Card>

        <Card className="p-4 border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rent Collection Efficiency</span>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-foreground">96.2%</span>
            <Badge variant="outline" className="text-[10px] font-bold bg-success/10 text-success border-success/20 gap-0.5">
              <ArrowUpRight className="h-3 w-3" /> +1.8% {comparisonMode}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Target threshold: 95.0%</p>
        </Card>

        <Card className="p-4 border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Net Operating Arrears</span>
            <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-destructive">KES 245,000</span>
            <Badge variant="outline" className="text-[10px] font-bold bg-success/10 text-success border-success/20 gap-0.5">
              <ArrowDownRight className="h-3 w-3" /> -8.4% {comparisonMode}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Down KES 22,500 from last month</p>
        </Card>
      </div>

      {/* Main Multi-Period Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/80 bg-card shadow-sm">
          <CardHeader className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Comparative Revenue & Forecast Engine</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Historical trajectory compared against previous period and projected AI forecast.
              </CardDescription>
            </div>

            <Select value={comparisonMode} onValueChange={setComparisonMode}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MoM" className="text-xs">Month vs Month</SelectItem>
                <SelectItem value="QoQ" className="text-xs">Quarter vs Quarter</SelectItem>
                <SelectItem value="YoY" className="text-xs">Year vs Year</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>

          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={MOM_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E6FD9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1E6FD9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Current" stroke="#1E6FD9" fillOpacity={1} fill="url(#colorCurrent)" strokeWidth={2} />
                <Line type="monotone" dataKey="Previous" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1.5} />
                <Line type="monotone" dataKey="Forecast" stroke="#10b981" strokeDasharray="3 3" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Occupancy Target & Predictive Forecast */}
        <Card className="lg:col-span-1 border-border/80 bg-card shadow-sm">
          <CardHeader className="p-4 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-success" />
              <CardTitle className="text-sm font-bold text-foreground">Occupancy Forecast & Benchmark</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Predictive occupancy rates vs 95% target threshold.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={OCCUPANCY_FORECAST} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Occupancy" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Target" stroke="#ef4444" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
