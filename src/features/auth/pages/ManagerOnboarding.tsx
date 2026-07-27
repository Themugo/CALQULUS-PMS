import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import {
  Building2, CreditCard, CheckCircle, ChevronRight,
  Loader2, Smartphone, Landmark, User, Zap,
} from 'lucide-react';
import calqulusLogo from '@/assets/calqulus-logo-new.png';

const STEPS = [
  { id: 'agency',  title: 'Your agency',    icon: Building2,   desc: 'Agency profile' },
  { id: 'billing', title: 'Billing method', icon: CreditCard,  desc: 'Platform fees' },
  { id: 'done',    title: 'All set!',        icon: CheckCircle, desc: 'Start managing' },
];

const COUNTIES = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Kiambu',
  'Machakos','Kajiado','Nyeri','Meru','Embu','Thika','Other'];

interface Props { onComplete: () => void; }

const ManagerOnboarding: React.FC<Props> = ({ onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  const [agencyName, setAgencyName] = useState('');
  const [agencyPhone, setAgencyPhone] = useState('');
  const [agencyEmail, setAgencyEmail] = useState(user?.email ?? '');
  const [agencyAddress, setAgencyAddress] = useState('');
  const [county, setCounty] = useState('');
  const [billingMethod, setBillingMethod] = useState('mpesa');

  const saveAgency = useMutation({
    mutationFn: async () => {
      if (!agencyName.trim()) throw new Error('Agency name is required');
      const { data: existing } = await supabase.from('agencies').select('id').eq('manager_id', user!.id).maybeSingle();
      const agencyData = { manager_id: user!.id, name: agencyName.trim(), phone: agencyPhone || null, email: agencyEmail || null, address: agencyAddress || null, county: county || null };
      if (existing) {
        const { error } = await supabase.from('agencies').update(agencyData).eq('id', existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('agencies').insert(agencyData);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => setStep(1),
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const saveBilling = useMutation({
    mutationFn: async () => {
      await supabase.from('manager_profiles').upsert({ manager_user_id: user!.id, billing_method: billingMethod, status: 'approved' }, { onConflict: 'manager_user_id' });
    },
    onSuccess: () => setStep(2),
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  return (
    <div className="fixed inset-0 z-50 flex hero-gradient overflow-y-auto">
      <div className="m-auto w-full max-w-lg px-4 py-12">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={calqulusLogo} alt="CALQULUS PMS" className="h-12 w-auto object-contain" />
        </div>
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-white mb-2">Welcome to CALQULUS PMS</h1>
          <p className="text-white/50 text-sm">Let's get your account set up in 2 quick steps</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6 px-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    done   ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25' :
                    active ? 'bg-amber-400 border-amber-400 text-slate-900 shadow-lg shadow-amber-400/30' :
                             'bg-white/5 border-white/15 text-white/30'
                  }`}>
                    {done ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs font-medium ${active ? 'text-white' : done ? 'text-emerald-400' : 'text-white/30'}`}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-3 mb-5 transition-colors duration-300 ${i < step ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.round((step / (STEPS.length - 1)) * 100)}%` }}
          />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 sm:p-8 shadow-2xl">

          {/* Step 0: Agency */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-lg font-bold text-white mb-0.5">Your agency profile</h2>
                <p className="text-sm text-white/50">This appears on invoices and receipts sent to tenants.</p>
              </div>
              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">Agency / Company name <span className="text-red-400">*</span></Label>
                <Input value={agencyName} onChange={e => setAgencyName(e.target.value)}
                  placeholder="e.g. Kamau Properties Ltd"
                  className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 h-10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70 text-sm mb-1.5 block">Phone / M-Pesa</Label>
                  <Input value={agencyPhone} onChange={e => setAgencyPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 h-10" />
                </div>
                <div>
                  <Label className="text-white/70 text-sm mb-1.5 block">Business email</Label>
                  <Input type="email" value={agencyEmail} onChange={e => setAgencyEmail(e.target.value)}
                    className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 h-10" />
                </div>
              </div>
              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">County</Label>
                <Select value={county} onValueChange={setCounty}>
                  <SelectTrigger className="bg-white/8 border-white/15 text-white focus:border-amber-400/60 h-10">
                    <SelectValue placeholder="Select county" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">Address <span className="text-white/30 font-normal">(optional)</span></Label>
                <Input value={agencyAddress} onChange={e => setAgencyAddress(e.target.value)}
                  placeholder="Street, building, town"
                  className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 h-10" />
              </div>
              <Button className="w-full h-11 btn-brand font-bold text-sm"
                onClick={() => saveAgency.mutate()} disabled={saveAgency.isPending || !agencyName.trim()}>
                {saveAgency.isPending
                  ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving…</span>
                  : <span className="flex items-center gap-2">Continue <ChevronRight className="h-4 w-4" /></span>
                }
              </Button>
            </div>
          )}

          {/* Step 1: Billing */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-lg font-bold text-white mb-0.5">Platform billing</h2>
                <p className="text-sm text-white/50">How would you like to pay your monthly platform fees?</p>
              </div>
              <div className="space-y-2">
                {[
                  { value: 'mpesa',         label: 'M-Pesa',        icon: Smartphone, desc: 'Pay via M-Pesa Paybill each month' },
                  { value: 'bank_transfer', label: 'Bank transfer',  icon: Landmark,   desc: 'Pay via bank transfer or EFT' },
                  { value: 'invoice_only',  label: 'Invoice only',   icon: CreditCard, desc: 'Receive invoice and pay manually' },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setBillingMethod(opt.value)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 ${
                      billingMethod === opt.value
                        ? 'border-amber-400/50 bg-amber-400/10 shadow-sm shadow-amber-400/10'
                        : 'border-white/12 bg-white/4 hover:bg-white/7 hover:border-white/20'
                    }`}>
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      billingMethod === opt.value ? 'bg-amber-400/20 text-amber-400' : 'bg-white/8 text-white/40'
                    }`}>
                      <opt.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${billingMethod === opt.value ? 'text-amber-300' : 'text-white/80'}`}>{opt.label}</p>
                      <p className="text-xs text-white/40 mt-0.5">{opt.desc}</p>
                    </div>
                    {billingMethod === opt.value && (
                      <CheckCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <div className="p-3.5 rounded-xl border border-amber-400/15 bg-amber-400/6">
                <p className="text-xs font-semibold text-amber-300/80 mb-1.5 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Platform fee
                </p>
                <p className="text-xs text-white/40 leading-relaxed">
                  KES 500 per property per month (Starter plan). Upgradeable as your portfolio grows. First 30 days free.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-white/15 text-white/60 hover:bg-white/8 h-11"
                  onClick={() => setStep(0)}>Back</Button>
                <Button className="flex-1 h-11 btn-brand font-bold text-sm"
                  onClick={() => saveBilling.mutate()} disabled={saveBilling.isPending}>
                  {saveBilling.isPending
                    ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving…</span>
                    : <span className="flex items-center gap-2">Continue <ChevronRight className="h-4 w-4" /></span>
                  }
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Done */}
          {step === 2 && (
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <CheckCircle className="h-10 w-10 text-emerald-400" />
                </div>
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold text-white mb-2">You're all set!</h2>
                <p className="text-white/50 text-sm">Your agency is configured. Start by adding your first property.</p>
              </div>
              <div className="space-y-2 text-left">
                {[
                  { icon: Building2, text: 'Add a property → then add units' },
                  { icon: User,      text: 'Invite your first tenant' },
                  { icon: CreditCard, text: 'Generate your first invoice' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 text-white/70">
                    <div className="h-7 w-7 rounded-lg bg-amber-400/12 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full h-12 btn-brand font-bold text-sm" onClick={onComplete}>
                <span className="flex items-center gap-2">Go to dashboard <ChevronRight className="h-4 w-4" /></span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerOnboarding;
