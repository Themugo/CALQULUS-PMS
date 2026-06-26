import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { logError } from '@/shared/lib/errorLogger';
import { useToast } from '@/shared/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Separator } from '@/shared/components/ui/separator';
import {
  FileDown, Send, Plus, X, Building2, CheckCircle2,
  AlertTriangle, Clock, TrendingUp, Loader2, Mail, Users,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceRow {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  description: string | null;
  tenants: { id: string; name: string; email: string; phone: string | null } | null;
  leases: { property: string; unit: string; property_id: string | null } | null;
}

interface PropertyGroup {
  name: string;
  invoices: InvoiceRow[];
  billed: number;
  collected: number;
  outstanding: number;
  cancelled: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtKES = (n: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES', minimumFractionDigits: 0,
  }).format(n);

const STATUS_BADGE: Record<string, string> = {
  paid:      'bg-emerald-100 text-emerald-700',
  pending:   'bg-amber-100 text-amber-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const YEARS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);

// ─── PDF generation ──────────────────────────────────────────────────────────

function buildPDF(
  periodLabel: string,
  companyName: string,
  properties: PropertyGroup[],
  totalBilled: number,
  totalCollected: number,
  totalOutstanding: number,
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fw = doc.internal.pageSize.getWidth();
  const BRAND_BLUE = [30, 111, 217] as [number, number, number];
  const BRAND_GOLD = [201, 168, 76] as [number, number, number];
  const WHITE      = [255, 255, 255] as [number, number, number];
  const DARK       = [30, 30, 30] as [number, number, number];

  // ── Header banner
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, fw, 30, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('RENT COLLECTION SUMMARY REPORT', 14, 20);
  doc.text(`Period: ${periodLabel}`, fw - 14, 20, { align: 'right' });
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, fw - 14, 27, { align: 'right' });

  doc.setTextColor(...DARK);

  // ── Summary KPI table
  const rate = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '0.0';
  autoTable(doc, {
    startY: 36,
    head: [['Total Billed', 'Total Collected', 'Outstanding', 'Collection Rate']],
    body: [[fmtKES(totalBilled), fmtKES(totalCollected), fmtKES(totalOutstanding), `${rate}%`]],
    headStyles: { fillColor: BRAND_GOLD, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 10, fontStyle: 'bold', halign: 'center' },
    columnStyles: { 3: { textColor: parseFloat(rate) >= 80 ? [16, 185, 129] : [239, 68, 68] } },
    margin: { left: 14, right: 14 },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ── Per-property sections
  for (const prop of properties) {
    if (prop.invoices.length === 0) continue;

    // Property header
    doc.setFillColor(245, 247, 250);
    doc.rect(14, y, fw - 28, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_BLUE);
    doc.text(prop.name, 16, y + 5);
    const propSummary = `Billed: ${fmtKES(prop.billed)}  ·  Collected: ${fmtKES(prop.collected)}  ·  Outstanding: ${fmtKES(prop.outstanding)}`;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(propSummary, fw - 16, y + 5, { align: 'right' });
    y += 10;

    doc.setTextColor(...DARK);

    autoTable(doc, {
      startY: y,
      head: [['Tenant', 'Unit', 'Invoice #', 'Description', 'Amount (KES)', 'Status', 'Paid Date']],
      body: prop.invoices.map(inv => [
        inv.tenants?.name ?? '—',
        inv.leases?.unit ?? '—',
        inv.invoice_number,
        inv.description ? inv.description.slice(0, 30) : 'Rent',
        fmtKES(inv.amount),
        inv.status.toUpperCase(),
        inv.paid_date ? format(parseISO(inv.paid_date), 'dd/MM/yyyy') : '—',
      ]),
      headStyles: { fillColor: [240, 242, 246], textColor: DARK, fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        4: { halign: 'right', fontStyle: 'bold' },
        5: { halign: 'center' },
        6: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.column.index === 5 && data.section === 'body') {
          const val = String(data.cell.raw).toLowerCase();
          if (val === 'paid')     data.cell.styles.textColor = [16, 185, 129];
          if (val === 'overdue')  data.cell.styles.textColor = [239, 68, 68];
          if (val === 'pending')  data.cell.styles.textColor = [217, 119, 6];
        }
      },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    // Sub-totals row
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(
      `  Subtotal — Collected: ${fmtKES(prop.collected)}   Outstanding: ${fmtKES(prop.outstanding)}`,
      14, y,
    );
    y += 8;

    if (y > 250) { doc.addPage(); y = 14; }
  }

  // ── Arrears table (all overdue across properties)
  const arrears = properties
    .flatMap(p => p.invoices.filter(i => i.status === 'overdue').map(i => ({ ...i, propName: p.name })))
    .sort((a, b) => b.amount - a.amount);

  if (arrears.length > 0) {
    if (y > 220) { doc.addPage(); y = 14; }
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(14, y, fw - 28, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('OVERDUE / ARREARS DETAIL', 16, y + 5);
    y += 10;
    doc.setTextColor(...DARK);

    autoTable(doc, {
      startY: y,
      head: [['Tenant', 'Phone', 'Property', 'Unit', 'Invoice #', 'Due Date', 'Amount (KES)']],
      body: arrears.map(i => [
        i.tenants?.name ?? '—',
        i.tenants?.phone ?? '—',
        i.propName,
        i.leases?.unit ?? '—',
        i.invoice_number,
        format(parseISO(i.due_date), 'dd/MM/yyyy'),
        fmtKES(i.amount),
      ]),
      headStyles: { fillColor: [254, 226, 226], textColor: [153, 27, 27], fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: { 6: { halign: 'right', fontStyle: 'bold', textColor: [239, 68, 68] } },
      margin: { left: 14, right: 14 },
    });
  }

  // ── Footer on last page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(`Page ${i} of ${pageCount}  ·  Confidential — ${companyName}`, fw / 2, 290, { align: 'center' });
  }

  return doc;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const RentCollectionSummary: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput,  setEmailInput]  = useState('');
  const [sending, setSending] = useState(false);

  const periodStart  = startOfMonth(new Date(year, month - 1, 1));
  const periodEnd    = endOfMonth(periodStart);
  const periodLabel  = format(periodStart, 'MMMM yyyy');
  const startStr     = format(periodStart, 'yyyy-MM-dd');
  const endStr       = format(periodEnd,   'yyyy-MM-dd');

  // ── Fetch invoices + company name ────────────────────────────────────────
  const { data: invoices = [], isLoading } = useQuery<InvoiceRow[]>({
    queryKey: ['rent-collection-summary', user?.id, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, amount, due_date, paid_date, status, description,
          tenants ( id, name, email, phone ),
          leases  ( property, unit, property_id )
        `)
        .eq('manager_id', user!.id)
        .gte('due_date', startStr)
        .lte('due_date', endStr)
        .order('due_date');
      if (error) { logError('RentCollectionSummary.fetch', error); return []; }
      return (data ?? []) as unknown as InvoiceRow[];
    },
    enabled: !!user?.id,
  });

  const { data: settings } = useQuery({
    queryKey: ['manager-settings-company', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('manager_settings')
        .select('company_name')
        .eq('manager_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const companyName = settings?.company_name ?? 'CALQULUS PMS';

  // ── Group by property ────────────────────────────────────────────────────
  const properties = useMemo<PropertyGroup[]>(() => {
    const map = new Map<string, PropertyGroup>();
    for (const inv of invoices) {
      const key = inv.leases?.property ?? 'Unassigned';
      if (!map.has(key)) {
        map.set(key, { name: key, invoices: [], billed: 0, collected: 0, outstanding: 0, cancelled: 0 });
      }
      const g = map.get(key)!;
      const amt = Number(inv.amount);
      g.invoices.push(inv);
      g.billed += amt;
      if (inv.status === 'paid')                         g.collected   += amt;
      if (inv.status === 'overdue' || inv.status === 'pending') g.outstanding += amt;
      if (inv.status === 'cancelled')                    g.cancelled   += amt;
    }
    return [...map.values()].sort((a, b) => b.billed - a.billed);
  }, [invoices]);

  const totalBilled      = properties.reduce((s, p) => s + p.billed, 0);
  const totalCollected   = properties.reduce((s, p) => s + p.collected, 0);
  const totalOutstanding = properties.reduce((s, p) => s + p.outstanding, 0);
  const collectionRate   = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
  const arrearsCount     = invoices.filter(i => i.status === 'overdue').length;

  // ── Actions ──────────────────────────────────────────────────────────────
  const addRecipient = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Invalid email', variant: 'destructive' }); return;
    }
    if (recipients.includes(email)) return;
    setRecipients(r => [...r, email]);
    setEmailInput('');
  };

  const handleDownload = () => {
    if (!invoices.length) return;
    const doc = buildPDF(periodLabel, companyName, properties, totalBilled, totalCollected, totalOutstanding);
    doc.save(`rent-collection-${year}-${String(month).padStart(2, '0')}.pdf`);
    toast({ title: 'PDF downloaded', description: `${periodLabel} collection report saved.` });
  };

  const handleSend = async () => {
    if (!recipients.length) {
      toast({ title: 'Add at least one recipient', variant: 'destructive' }); return;
    }
    setSending(true);
    try {
      const doc     = buildPDF(periodLabel, companyName, properties, totalBilled, totalCollected, totalOutstanding);
      const dataUrl = doc.output('dataurl');
      const b64     = dataUrl.split(',')[1];
      const fileName = `rent-collection-${year}-${String(month).padStart(2, '0')}.pdf`;

      const results = await Promise.allSettled(
        recipients.map(email =>
          supabase.functions.invoke('send-invoice-email', {
            body: {
              tenantEmail:  email,
              tenantName:   email,
              companyName,
              pdfBase64:    b64,
              fileName,
              subject:      `${companyName} — Rent Collection Summary: ${periodLabel}`,
            },
          }),
        ),
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed === 0) {
        toast({ title: 'Report sent', description: `Sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}.` });
      } else {
        toast({
          title: `Sent with ${failed} error${failed > 1 ? 's' : ''}`,
          description: 'Some recipients may not have received the report.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      logError('RentCollectionSummary.send', err);
      toast({ title: 'Failed to send report', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Period selector ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            Rent Collection Report
          </CardTitle>
          <CardDescription>Monthly PDF report grouped by property — download or email to landlords, managers &amp; agencies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Month</Label>
              <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Year</Label>
              <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
              onClick={() => {
                const prev = subMonths(new Date(year, month - 1, 1), 1);
                setMonth(prev.getMonth() + 1);
                setYear(prev.getFullYear());
              }}>
              ← Prev month
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                onClick={handleDownload} disabled={isLoading || !invoices.length}>
                <FileDown className="h-3.5 w-3.5" />Download PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Billed',       val: totalBilled,      icon: TrendingUp,   color: 'text-blue-600',    bg: 'bg-blue-50    dark:bg-blue-950/30' },
            { label: 'Collected',          val: totalCollected,   icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { label: 'Outstanding',        val: totalOutstanding, icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50   dark:bg-amber-950/30' },
            { label: 'Arrears invoices',   val: arrearsCount,     icon: AlertTriangle,color: 'text-red-600',     bg: 'bg-red-50     dark:bg-red-950/30', count: true },
          ].map(({ label, val, icon: Icon, color, bg, count }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className={cn('p-4 rounded-xl', bg)}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn('h-4 w-4', color)} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <p className={cn('text-xl font-bold', color)}>
                  {count ? val : formatCurrency(val)}
                </p>
                {label === 'Collected' && totalBilled > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {collectionRate.toFixed(1)}% collection rate
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Per-property breakdown ── */}
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No invoices found for {periodLabel}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {properties.map(prop => (
            <Card key={prop.name}>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    {prop.name}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="text-muted-foreground">Billed: <strong>{formatCurrency(prop.billed)}</strong></span>
                    <span className="text-emerald-600">Collected: <strong>{formatCurrency(prop.collected)}</strong></span>
                    {prop.outstanding > 0 && (
                      <span className="text-amber-600">Outstanding: <strong>{formatCurrency(prop.outstanding)}</strong></span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 font-medium">Tenant</th>
                        <th className="text-left py-2 font-medium">Unit</th>
                        <th className="text-left py-2 font-medium">Invoice</th>
                        <th className="text-right py-2 font-medium">Amount</th>
                        <th className="text-center py-2 font-medium">Status</th>
                        <th className="text-center py-2 font-medium">Paid date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prop.invoices.map(inv => (
                        <tr key={inv.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-2 font-medium truncate max-w-[120px]">{inv.tenants?.name ?? '—'}</td>
                          <td className="py-2 text-muted-foreground">{inv.leases?.unit ?? '—'}</td>
                          <td className="py-2 text-muted-foreground font-mono">{inv.invoice_number}</td>
                          <td className="py-2 text-right font-semibold">{formatCurrency(inv.amount)}</td>
                          <td className="py-2 text-center">
                            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-semibold', STATUS_BADGE[inv.status] ?? '')}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-2 text-center text-muted-foreground">
                            {inv.paid_date ? format(parseISO(inv.paid_date), 'dd/MM/yyyy') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Email recipients & send ── */}
      {!isLoading && invoices.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="h-4 w-4 text-amber-500" />
              Send Report
            </CardTitle>
            <CardDescription>Add landlord, agency, or manager email addresses — the PDF is attached automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Recipient chips */}
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recipients.map(r => (
                  <span key={r} className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-xs font-medium">
                    <Users className="h-2.5 w-2.5 text-muted-foreground" />
                    {r}
                    <button
                      className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => setRecipients(rs => rs.filter(x => x !== r))}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input row */}
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="landlord@example.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(); } }}
                className="h-8 text-sm flex-1"
              />
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs shrink-0" onClick={addRecipient}>
                <Plus className="h-3 w-3" />Add
              </Button>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleSend}
                disabled={sending || !recipients.length}
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {sending ? 'Sending…' : `Send to ${recipients.length || 0} recipient${recipients.length !== 1 ? 's' : ''}`}
              </Button>
              <span className="text-xs text-muted-foreground">
                Attaches the {periodLabel} PDF automatically
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
