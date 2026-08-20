// @ts-nocheck — Phase 12: remaining local types until live supabase gen types
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { CALQULUS_COLOR } from '@/shared/theme/tokens';
import { paymentMethodLabel } from '@/shared/lib/statusBadge';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

interface Payment { amount: number; paid_date: string | null; payment_method?: string | null; tenants?: { name: string } | null; }
interface PendingInvoice { amount: number; status: string; }

interface PaymentAnalyticsProps {
  payments: Payment[];
  pendingInvoices: PendingInvoice[];
}

const PaymentAnalytics: React.FC<PaymentAnalyticsProps> = ({ payments, pendingInvoices }) => {
  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalPending   = pendingInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const overdue        = pendingInvoices.filter(i => i.status === 'overdue');
  const totalOverdue   = overdue.reduce((s, i) => s + Number(i.amount), 0);
  const collectionRate = totalCollected + totalPending > 0
    ? Math.round((totalCollected / (totalCollected + totalPending)) * 100) : 0;

  const byMethod = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of payments) {
      const m = p.payment_method ?? 'unknown';
      map[m] = (map[m] ?? 0) + Number(p.amount);
    }
    return Object.entries(map)
      .map(([method, amount]) => ({ method, label: paymentMethodLabel(method), amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [payments]);

  const monthlyTrend = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    for (const p of payments) {
      if (!p.paid_date) continue;
      const key = p.paid_date.slice(0, 7);
      if (key in months) months[key] += Number(p.amount);
    }
    return Object.entries(months).map(([k, v]) => ({ month: k.slice(5), amount: v }));
  }, [payments]);

  const topTenants = useMemo(() => {
    const map: Record<string, { name: string; total: number }> = {};
    for (const p of payments) {
      const name = p.tenants?.name ?? 'Unknown';
      if (!map[name]) map[name] = { name, total: 0 };
      map[name].total += Number(p.amount);
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [payments]);

  const kpis = [
    { label: 'Collected (shown period)', value: fmt(totalCollected) },
    { label: 'Outstanding', value: fmt(totalPending) },
    { label: 'Overdue balance', value: fmt(totalOverdue) },
    { label: 'Collection rate', value: `${collectionRate}%` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-lg font-bold text-foreground">{k.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly collections — last 6 months</CardTitle>
          <CardDescription>Completed payment totals from the ledger. Exact rows stay on Payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v/1000)}K`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="amount" name="Collected" fill={CALQULUS_COLOR.primary} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payment methods</CardTitle>
            <CardDescription>M-Pesa, Stripe, bank, and receipt totals from stored methods.</CardDescription>
          </CardHeader>
          <CardContent>
            {byMethod.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No payment data</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">Method</th>
                    <th className="py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {byMethod.map((m) => (
                    <tr key={m.method} className="border-b border-border/60">
                      <td className="py-2 text-foreground">{m.label}</td>
                      <td className="py-2 text-right font-medium text-foreground">{fmt(m.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top paying tenants</CardTitle>
            <CardDescription>Highest completed totals in the selected ledger.</CardDescription>
          </CardHeader>
          <CardContent>
            {topTenants.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No payment data</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">Tenant</th>
                    <th className="py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {topTenants.map((t) => (
                    <tr key={t.name} className="border-b border-border/60">
                      <td className="py-2 text-foreground">{t.name}</td>
                      <td className="py-2 text-right font-medium text-foreground">{fmt(t.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentAnalytics;
